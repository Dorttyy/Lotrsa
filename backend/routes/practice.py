"""Paid Practice — coin-gated practice conversations with practice partners.

A user marks themselves as a paid-practice partner (with a coin `practice_rate`)
from their profile. To send messages to such a partner, another user must
"unlock" the conversation once, spending coins; the unlock lasts 24 hours.
"""

from datetime import datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, HTTPException

from auth_utils import CurrentUser
from db import gift_unlocks_col, practice_unlocks_col, users_col
from db import db as _appdb

wallet_tx_col = _appdb["wallet_tx"]

router = APIRouter(prefix="/practice", tags=["practice"])

UNLOCK_HOURS = 24


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


async def active_unlock(buyer_id: str, partner_id: str) -> dict | None:
    """Return the unlock doc if the buyer currently has practice access."""
    doc = await practice_unlocks_col.find_one(
        {"buyer_id": buyer_id, "partner_id": partner_id}
    )
    if doc and doc.get("expires_at", "") > _iso(_now()):
        return doc
    return None


@router.get("/status/{partner_id}")
async def practice_status(partner_id: str, current_user: CurrentUser):
    """Whether this partner is a paid-practice partner and my unlock state."""
    partner = await users_col.find_one({"_id": partner_id}, {"password_hash": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="User not found")
    is_paid = bool(partner.get("paid_practice"))
    rate = int(partner.get("practice_rate") or 50)
    unlock = await active_unlock(current_user["_id"], partner_id) if is_paid else None
    # Gift gate state
    gift_gate = bool(partner.get("gift_gate"))
    gift_min = int(partner.get("gift_gate_min") or 20)
    gift_unlock = None
    if gift_gate:
        gift_unlock = await gift_unlocks_col.find_one(
            {"buyer_id": current_user["_id"], "partner_id": partner_id}
        )
    return {
        "partner_id": partner_id,
        "is_paid_partner": is_paid,
        "rate": rate,
        "unlocked": bool(unlock),
        "expires_at": unlock.get("expires_at") if unlock else None,
        "is_gift_gate": gift_gate,
        "gift_min": gift_min,
        "gift_unlocked": bool(gift_unlock),
        "coins": int(current_user.get("coins") or 0),
    }


@router.post("/unlock/{partner_id}")
async def practice_unlock(partner_id: str, current_user: CurrentUser):
    """Spend coins to unlock a 24h practice conversation with the partner."""
    if partner_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="You can't unlock yourself.")
    partner = await users_col.find_one({"_id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="User not found")
    if not partner.get("paid_practice"):
        raise HTTPException(
            status_code=400, detail="This user does not offer paid practice."
        )

    # Already unlocked? Idempotent — just report the current state.
    existing = await active_unlock(current_user["_id"], partner_id)
    if existing:
        return {
            "ok": True,
            "already": True,
            "expires_at": existing["expires_at"],
            "coins": int(current_user.get("coins") or 0),
        }

    rate = int(partner.get("practice_rate") or 50)
    coins = int(current_user.get("coins") or 0)
    if coins < rate:
        raise HTTPException(
            status_code=402,
            detail=f"Not enough coins. You need {rate} coins to unlock practice.",
        )

    expires_at = _iso(_now() + timedelta(hours=UNLOCK_HOURS))
    # Deduct from buyer, credit the partner (they earn from practice).
    await users_col.update_one(
        {"_id": current_user["_id"]}, {"$inc": {"coins": -rate}}
    )
    await users_col.update_one({"_id": partner_id}, {"$inc": {"coins": rate}})
    # Record both sides in the wallet ledger so earnings/spends are visible.
    partner = await users_col.find_one({"_id": partner_id}, {"name": 1})
    me_name = current_user.get("name") or "someone"
    partner_name = (partner or {}).get("name") or "partner"
    await wallet_tx_col.insert_many(
        [
            {
                "_id": str(uuid.uuid4()),
                "user_id": partner_id,
                "kind": "coin",
                "amount": rate,
                "label": f"Paid practice from {me_name}",
                "created_at": _iso(_now()),
            },
            {
                "_id": str(uuid.uuid4()),
                "user_id": current_user["_id"],
                "kind": "coin",
                "amount": -rate,
                "label": f"Unlocked practice with {partner_name}",
                "created_at": _iso(_now()),
            },
        ]
    )
    await practice_unlocks_col.update_one(
        {"buyer_id": current_user["_id"], "partner_id": partner_id},
        {
            "$set": {
                "buyer_id": current_user["_id"],
                "partner_id": partner_id,
                "unlocked_at": _iso(_now()),
                "expires_at": expires_at,
                "rate": rate,
            }
        },
        upsert=True,
    )
    return {
        "ok": True,
        "already": False,
        "expires_at": expires_at,
        "coins": coins - rate,
    }
