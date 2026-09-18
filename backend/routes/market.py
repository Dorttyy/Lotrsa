import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from auth_utils import CurrentUser
from db import market_config_col, users_col
from models import user_card, user_public

router = APIRouter(prefix="/market", tags=["market"])

# Static marketplace catalog — prices in coins.
CATALOG = [
    {"id": "vip_weekly", "type": "vip", "name": "VIP — 7 Days", "emoji": "✨", "price": 150, "duration_days": 7, "color": "#F59E0B", "desc": "Try VIP: badge, 3 learning languages & unlimited chats for a week"},
    {"id": "vip_monthly", "type": "vip", "name": "VIP — 1 Month", "emoji": "💎", "price": 500, "duration_days": 30, "color": "#F59E0B", "desc": "Gold VIP badge, 3 learning languages, unlimited chats"},
    {"id": "vip_lifetime", "type": "vip", "name": "VIP — Lifetime", "emoji": "👑", "price": 2000, "duration_days": None, "color": "#8B5CF6", "desc": "Purple lifetime VIP badge & all VIP perks forever"},
    {"id": "badge_star", "type": "badge", "name": "Star Badge", "emoji": "⭐", "price": 100, "duration_days": 7, "desc": "Shine next to your name for 7 days"},
    {"id": "badge_fire", "type": "badge", "name": "Fire Badge", "emoji": "🔥", "price": 100, "duration_days": 7, "desc": "Show you're on fire for 7 days"},
    {"id": "badge_crown", "type": "badge", "name": "Crown Badge", "emoji": "👑", "price": 150, "duration_days": 7, "desc": "Royal look for 7 days"},
    {"id": "badge_heart", "type": "badge", "name": "Heart Badge", "emoji": "💖", "price": 80, "duration_days": 7, "desc": "Spread the love for 7 days"},
    {"id": "frame_gold", "type": "frame", "name": "Gold Ring", "emoji": "🟡", "price": 150, "duration_days": 7, "color": "#F59E0B", "desc": "Golden ring around your avatar for 7 days"},
    {"id": "frame_blue", "type": "frame", "name": "Sky Ring", "emoji": "🔵", "price": 120, "duration_days": 7, "color": "#0EA5E9", "desc": "Sky-blue avatar ring for 7 days"},
    {"id": "frame_pink", "type": "frame", "name": "Rose Ring", "emoji": "🌸", "price": 120, "duration_days": 7, "color": "#EC4899", "desc": "Rose avatar ring for 7 days"},
    {"id": "frame_green", "type": "frame", "name": "Emerald Ring", "emoji": "🟢", "price": 120, "duration_days": 7, "color": "#22C55E", "desc": "Emerald avatar ring for 7 days"},
    {"id": "frame_rainbow", "type": "frame", "name": "Rainbow Pulse", "emoji": "🌈", "price": 300, "duration_days": 7, "color": "#F59E0B", "colors": ["#F59E0B", "#EC4899", "#8B5CF6", "#0EA5E9"], "animated": True, "desc": "Animated rainbow ring cycling colors — 7 days"},
    {"id": "frame_neon", "type": "frame", "name": "Neon Glow", "emoji": "💫", "price": 250, "duration_days": 7, "color": "#22D3EE", "colors": ["#22D3EE", "#22C55E", "#22D3EE"], "animated": True, "desc": "Glowing animated neon ring — 7 days"},
]
# Categories store items (avatar effects / chat bubbles / backgrounds /
# profile frames / entry effects). All 7-day cosmetics.
STORE_ITEMS = [
    # avatar effects (ring colors reuse the frame system so they really apply)
    {"id": "fx_blackcat", "type": "frame", "cat": "avatar", "name": "Little black cat", "emoji": "🐈‍⬛", "price": 199, "duration_days": 7, "color": "#F472B6"},
    {"id": "fx_leo", "type": "frame", "cat": "avatar", "name": "Leo", "emoji": "🦁", "price": 199, "duration_days": 7, "color": "#F5B700"},
    {"id": "fx_cancer", "type": "frame", "cat": "avatar", "name": "Cancer", "emoji": "🦀", "price": 199, "duration_days": 7, "color": "#A78BFA"},
    {"id": "fx_game", "type": "frame", "cat": "avatar", "name": "Game Changer", "emoji": "⚽", "price": 199, "duration_days": 7, "color": "#22C55E"},
    {"id": "fx_pirate", "type": "frame", "cat": "avatar", "name": "Pirate", "emoji": "🏴‍☠️", "price": 199, "duration_days": 7, "color": "#334155"},
    {"id": "fx_azure", "type": "frame", "cat": "avatar", "name": "Azure Heart", "emoji": "💙", "price": 199, "duration_days": 7, "color": "#38BDF8"},
    {"id": "fx_dream", "type": "frame", "cat": "avatar", "name": "Dreamheart", "emoji": "💗", "price": 199, "duration_days": 7, "color": "#F9A8D4"},
    {"id": "fx_bee", "type": "frame", "cat": "avatar", "name": "Busy Little Bee", "emoji": "🐝", "price": 199, "duration_days": 7, "color": "#FACC15"},
    {"id": "fx_gleam", "type": "frame", "cat": "avatar", "name": "Dreamy Gleam", "emoji": "🌈", "price": 169, "duration_days": 7, "color": "#8B5CF6", "colors": ["#8B5CF6", "#38BDF8", "#22C55E"], "animated": True},
    {"id": "fx_bunny", "type": "frame", "cat": "avatar", "name": "Bunny", "emoji": "🐰", "price": 128, "duration_days": 7, "color": "#FDA4AF"},
    # chat bubbles
    {"id": "bub_cat", "type": "bubble", "cat": "bubble", "name": "Little Black Cat", "emoji": "🐈‍⬛", "price": 169, "duration_days": 7, "color": "#FBCFE8"},
    {"id": "bub_leo", "type": "bubble", "cat": "bubble", "name": "Leo", "emoji": "🦁", "price": 169, "duration_days": 7, "color": "#F5B700"},
    {"id": "bub_champ", "type": "bubble", "cat": "bubble", "name": "Champion Support", "emoji": "🏆", "price": 169, "duration_days": 7, "color": "#5EEAD4"},
    {"id": "bub_game", "type": "bubble", "cat": "bubble", "name": "Game Changer", "emoji": "🎮", "price": 169, "duration_days": 7, "color": "#22C55E"},
    {"id": "bub_cancer", "type": "bubble", "cat": "bubble", "name": "Cancer", "emoji": "🦀", "price": 169, "duration_days": 7, "color": "#3B82F6"},
    {"id": "bub_unicorn", "type": "bubble", "cat": "bubble", "name": "Unicorn", "emoji": "🦄", "price": 169, "duration_days": 7, "color": "#C4B5FD"},
    {"id": "bub_sakura", "type": "bubble", "cat": "bubble", "name": "Sakura", "emoji": "🌸", "price": 199, "duration_days": 7, "color": "#FBCFE8"},
    {"id": "bub_race", "type": "bubble", "cat": "bubble", "name": "Racing Car", "emoji": "🏎️", "price": 169, "duration_days": 7, "color": "#93C5FD"},
    # chat backgrounds
    {"id": "bg_sunset", "type": "background", "cat": "background", "name": "Sunset", "emoji": "🌅", "price": 149, "duration_days": 7, "color": "#FDBA74"},
    {"id": "bg_ocean", "type": "background", "cat": "background", "name": "Ocean", "emoji": "🌊", "price": 149, "duration_days": 7, "color": "#7DD3FC"},
    {"id": "bg_forest", "type": "background", "cat": "background", "name": "Forest", "emoji": "🌲", "price": 149, "duration_days": 7, "color": "#86EFAC"},
    {"id": "bg_galaxy", "type": "background", "cat": "background", "name": "Galaxy", "emoji": "🌌", "price": 199, "duration_days": 7, "color": "#A78BFA"},
    # profile frames (voice room card top decorations)
    {"id": "pf_unicorn", "type": "profile_frame", "cat": "profile_frame", "name": "Unicorn", "emoji": "🦄", "price": 599, "duration_days": 7, "color": "#C4B5FD"},
    {"id": "pf_butterfly", "type": "profile_frame", "cat": "profile_frame", "name": "Butterfly Blossom", "emoji": "🦋", "price": 599, "duration_days": 7, "color": "#A78BFA"},
    {"id": "pf_panda", "type": "profile_frame", "cat": "profile_frame", "name": "Cute Panda", "emoji": "🐼", "price": 399, "duration_days": 7, "color": "#86EFAC"},
    {"id": "pf_alpaca", "type": "profile_frame", "cat": "profile_frame", "name": "Alpaca", "emoji": "🦙", "price": 399, "duration_days": 7, "color": "#F9A8D4"},
    {"id": "pf_planet", "type": "profile_frame", "cat": "profile_frame", "name": "Fantasy Planet", "emoji": "🪐", "price": 399, "duration_days": 7, "color": "#7DD3FC"},
    {"id": "pf_rose", "type": "profile_frame", "cat": "profile_frame", "name": "Black Rose", "emoji": "🥀", "price": 399, "duration_days": 7, "color": "#475569"},
    # entry effects
    {"id": "en_comet", "type": "entry", "cat": "entry", "name": "Comet Entry", "emoji": "☄️", "price": 299, "duration_days": 7, "color": "#38BDF8"},
    {"id": "en_royal", "type": "entry", "cat": "entry", "name": "Royal Entry", "emoji": "👑", "price": 399, "duration_days": 7, "color": "#F5B700"},
    {"id": "en_neon", "type": "entry", "cat": "entry", "name": "Neon Entry", "emoji": "💫", "price": 299, "duration_days": 7, "color": "#22D3EE"},
    {"id": "en_hearts", "type": "entry", "cat": "entry", "name": "Hearts Entry", "emoji": "💞", "price": 249, "duration_days": 7, "color": "#F472B6"},
]
CATALOG = CATALOG + STORE_ITEMS
ITEM_MAP = {i["id"]: i for i in CATALOG}
VIP_TIERS = {"vip_weekly": "weekly", "vip_monthly": "monthly", "vip_lifetime": "lifetime"}


class BuyRequest(BaseModel):
    item_id: str


TOPUP_AMOUNTS = {100, 500, 1000, 2000}


class TopupRequest(BaseModel):
    amount: int


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("")
async def get_market(current_user: CurrentUser):
    now = _now().isoformat()
    active_badge = current_user.get("active_badge") or {}
    active_frame = current_user.get("active_frame") or {}
    items = []
    overrides = {d["_id"]: d async for d in market_config_col.find({})}
    for item in CATALOG:
        o = overrides.get(item["id"], {})
        if o.get("disabled"):
            continue
        entry = dict(item)
        entry["price"] = o.get("price", item["price"])
        if item["type"] == "vip":
            entry["active"] = bool(
                current_user.get("is_vip")
                and current_user.get("vip_tier") == VIP_TIERS[item["id"]]
                and (not current_user.get("vip_expires_at") or current_user["vip_expires_at"] > now)
            )
        elif item["type"] == "badge":
            entry["active"] = active_badge.get("id") == item["id"] and (
                not active_badge.get("expires_at") or active_badge["expires_at"] > now
            )
        else:
            entry["active"] = active_frame.get("id") == item["id"] and (
                not active_frame.get("expires_at") or active_frame["expires_at"] > now
            )
        items.append(entry)
    return {"coins": current_user.get("coins", 0), "items": items}


@router.post("/buy")
async def buy_item(body: BuyRequest, current_user: CurrentUser):
    item = ITEM_MAP.get(body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item["type"] == "vip":
        raise HTTPException(410, "VIP is purchased through the app store, not with coins.")
    override = await market_config_col.find_one({"_id": body.item_id}) or {}
    if override.get("disabled"):
        raise HTTPException(status_code=400, detail="Item is currently unavailable")
    price = override.get("price", item["price"])
    coins = current_user.get("coins", 0)
    if coins < price:
        raise HTTPException(status_code=400, detail="Not enough coins")
    updates: dict = {"coins": coins - price}
    expires = (
        (_now() + timedelta(days=item["duration_days"])).isoformat()
        if item.get("duration_days")
        else None
    )
    if item["type"] == "vip":
        updates["is_vip"] = True
        updates["vip_tier"] = VIP_TIERS[item["id"]]
        updates["vip_expires_at"] = expires
    elif item["type"] == "badge":
        updates["active_badge"] = {
            "id": item["id"],
            "emoji": item["emoji"],
            "expires_at": expires,
        }
    elif item["type"] == "frame":
        updates["active_frame"] = {
            "id": item["id"],
            "color": item["color"],
            "colors": item.get("colors"),
            "animated": item.get("animated", False),
            "expires_at": expires,
        }
    else:
        # bubbles / backgrounds / profile frames / entry effects — store the
        # active pick per type (cosmetics used by rooms & chats).
        updates[f"active_{item['type']}"] = {
            "id": item["id"],
            "color": item.get("color"),
            "expires_at": expires,
        }
    backpack_entry = {
        "id": item["id"],
        "type": item["type"],
        "cat": item.get("cat") or item["type"],
        "name": item["name"],
        "emoji": item.get("emoji"),
        "color": item.get("color"),
        "colors": item.get("colors"),
        "animated": item.get("animated", False),
        "expires_at": expires,
        "bought_at": _now().isoformat(),
    }
    await users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": updates, "$push": {"backpack": backpack_entry}},
    )
    current_user.update(updates)
    return {"coins": updates["coins"], "user": user_public(current_user)}


@router.post("/topup")
async def topup(body: TopupRequest, current_user: CurrentUser):
    raise HTTPException(410, "Coin purchases require a verified Google Play or App Store transaction.")


# --------------------------------------------------------------------------- #
# Boost purchases — coins are deducted and the moment/profile is pinned to the
# top of its feed for a limited time window (NOT permanent).
# --------------------------------------------------------------------------- #


from db import moments_col  # noqa: E402

BOOST_PRICES = {
    "moment": {500: 239, 1000: 429, 2000: 799, 3000: 1099},
    "profile": {500: 159, 1000: 299, 2000: 549, 3000: 799},
}
BOOST_HOURS = 24


class BoostBody(BaseModel):
    kind: str  # "moment" | "profile"
    size: int
    moment_id: str | None = None


@router.post("/boost")
async def purchase_boost(body: BoostBody, current_user: CurrentUser):
    prices = BOOST_PRICES.get(body.kind)
    if not prices or body.size not in prices:
        raise HTTPException(status_code=400, detail="Invalid boost package")
    price = prices[body.size]
    coins = current_user.get("coins", 0)
    if coins < price:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough coins — this boost costs {price} coins.",
        )
    until = (datetime.now(timezone.utc) + timedelta(hours=BOOST_HOURS)).isoformat()
    if body.kind == "moment":
        if not body.moment_id:
            raise HTTPException(status_code=400, detail="moment_id is required")
        doc = await moments_col.find_one({"_id": body.moment_id})
        if not doc or doc["user_id"] != current_user["_id"]:
            raise HTTPException(status_code=404, detail="Moment not found")
        await moments_col.update_one(
            {"_id": body.moment_id}, {"$set": {"boost_until": until}}
        )
    else:
        await users_col.update_one(
            {"_id": current_user["_id"]}, {"$set": {"boost_until": until}}
        )
    await users_col.update_one(
        {"_id": current_user["_id"]}, {"$inc": {"coins": -price}}
    )
    return {"ok": True, "coins": coins - price, "boost_until": until}


# --------------------------------------------------------------------------- #
# Wallet: coins top-up (MOCK payment), diamonds, gift ledger, transactions.
# --------------------------------------------------------------------------- #
from db import db as _db  # noqa: E402

wallet_tx_col = _db["wallet_tx"]
gift_ledger_col = _db["gift_ledger"]

TOPUP_PACKS = {8: "KZT 66.34", 64: "KZT 499", 324: "KZT 2490", 649: "KZT 4990", 3249: "KZT 24990", 10334: "KZT 79990"}
VIP_COST = {3: 94, 7: 218, 30: 931, 60: 1862, 90: 2793}


class TopupBody(BaseModel):
    coins: int


class RedeemBody(BaseModel):
    what: str  # "coins" | "vip"
    days: int | None = None


async def _tx(user_id: str, kind: str, amount: float, label: str):
    await wallet_tx_col.insert_one(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "kind": kind,
            "amount": amount,
            "label": label,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )


@router.get("/wallet")
async def wallet(current_user: CurrentUser):
    return {
        "coins": current_user.get("coins", 0),
        "diamonds": round(current_user.get("diamonds", 0) or 0, 2),
    }


@router.post("/topup-pack")
async def topup_pack(body: TopupBody, current_user: CurrentUser):
    raise HTTPException(410, "Coin packs are awaiting verified store billing setup. Your existing coins are unchanged.")


@router.post("/redeem")
async def redeem(body: RedeemBody, current_user: CurrentUser):
    diamonds = current_user.get("diamonds", 0) or 0
    if body.what == "coins":
        if diamonds < 100:
            raise HTTPException(status_code=400, detail="You need at least 100 diamonds to redeem")
        coins_gained = int(diamonds * 1.1)
        await users_col.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"coins": coins_gained}, "$set": {"diamonds": 0}},
        )
        await _tx(current_user["_id"], "diamond", -diamonds, "Redeemed for coins")
        await _tx(current_user["_id"], "coin", coins_gained, "Diamond exchange (+10% bonus)")
        return {"ok": True, "coins_gained": coins_gained}
    if body.what == "vip":
        raise HTTPException(410, "VIP is purchased through the app store. Diamonds remain available for coin exchange.")
    raise HTTPException(status_code=400, detail="Invalid redeem type")


@router.get("/gifts")
async def gift_history(current_user: CurrentUser, dir: str = "received"):
    field = "to_id" if dir == "received" else "from_id"
    docs = (
        await gift_ledger_col.find({field: current_user["_id"]})
        .sort("created_at", -1)
        .to_list(100)
    )
    other_ids = list({d["from_id" if dir == "received" else "to_id"] for d in docs})
    others = await users_col.find({"_id": {"$in": other_ids}}).to_list(len(other_ids))
    omap = {o["_id"]: user_card(o) for o in others}
    total_value = round(sum(d.get("diamonds", 0) for d in docs), 2)
    return {
        "total_value": total_value,
        "count": len(docs),
        "items": [
            {
                "id": d["_id"],
                "user": omap.get(d["from_id" if dir == "received" else "to_id"]),
                "emoji": d["emoji"],
                "name": d["name"],
                "diamonds": d.get("diamonds", 0),
                "created_at": d["created_at"],
            }
            for d in docs
        ],
    }


@router.get("/transactions")
async def transactions(current_user: CurrentUser, kind: str = "coin"):
    docs = (
        await wallet_tx_col.find({"user_id": current_user["_id"], "kind": kind})
        .sort("created_at", -1)
        .to_list(100)
    )
    totals = round(sum(d["amount"] for d in docs if d["amount"] > 0), 2)
    spent = round(-sum(d["amount"] for d in docs if d["amount"] < 0), 2)
    return {
        "totals": totals,
        "spent": spent,
        "items": [
            {
                "id": d["_id"],
                "amount": d["amount"],
                "label": d["label"],
                "created_at": d["created_at"],
            }
            for d in docs
        ],
    }



@router.get("/backpack")
async def get_backpack(current_user: CurrentUser):
    now = _now().isoformat()
    items = current_user.get("backpack") or []
    active_ids = set()
    for key in ("active_frame", "active_badge", "active_bubble", "active_background", "active_profile_frame", "active_entry"):
        a = current_user.get(key) or {}
        if a.get("id") and (not a.get("expires_at") or a["expires_at"] > now):
            active_ids.add(a["id"])
    out = []
    for it in items:
        expired = bool(it.get("expires_at") and it["expires_at"] <= now)
        out.append({**it, "expired": expired, "in_use": it["id"] in active_ids and not expired})
    return {"items": out}


class UseItemBody(BaseModel):
    item_id: str


@router.post("/use")
async def use_item(body: UseItemBody, current_user: CurrentUser):
    now = _now().isoformat()
    for it in current_user.get("backpack") or []:
        if it["id"] == body.item_id:
            if it.get("expires_at") and it["expires_at"] <= now:
                raise HTTPException(status_code=400, detail="This item has expired — buy it again in the store")
            key = "active_frame" if it["type"] == "frame" else f"active_{it['type']}"
            await users_col.update_one(
                {"_id": current_user["_id"]},
                {"$set": {key: {"id": it["id"], "color": it.get("color"), "colors": it.get("colors"), "animated": it.get("animated", False), "expires_at": it.get("expires_at")}}},
            )
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Item not in your backpack")



# --------------------------------------------------------------------------- #
# LinguaConnect merch store (real-product e-commerce, checkout = Cash on
# Delivery order records — no card processing yet).
# --------------------------------------------------------------------------- #
STORE_PRODUCTS = [
    {"id": "sp_tshirt", "name": "【🔥 Promo】 LinguaConnect Official Language Learner T-Shirt", "price": 24.99, "category": "Apparel", "sizes": ["S", "M", "L", "XL", "2XL", "3XL"], "image": "https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "desc": "Soft 100% cotton tee with the multilingual Hello print."},
    {"id": "sp_tote", "name": "【🔥 Promo】 Cute Canvas Tote Bag — Fun Multilingual Print", "price": 7.99, "category": "Bags", "sizes": [], "image": "https://images.unsplash.com/photo-1574365569389-a10d488ca3fb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHx0b3RlJTIwYmFnfGVufDB8fHx8MTc4NTQzNjU5M3ww&ixlib=rb-4.1.0&q=85", "desc": "Durable canvas tote with Hello in 6 languages."},
    {"id": "sp_backpack", "name": "【🔥 Promo】 16-Inch Water-Resistant Travel Backpack", "price": 39.99, "category": "Bags", "sizes": [], "image": "https://images.unsplash.com/photo-1544816155-12df9643f363?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwyfHx0b3RlJTIwYmFnfGVufDB8fHx8MTc4NTQzNjU5M3ww&ixlib=rb-4.1.0&q=85", "desc": "Anti-theft pocket, laptop sleeve, made for language travellers."},
    {"id": "sp_case", "name": "Smart E-Ink Phone Case with Daily Word Display", "price": 41.99, "category": "phone case", "sizes": ["iPhone 15", "iPhone 15 Pro", "S24"], "image": "https://images.pexels.com/photos/18403793/pexels-photo-18403793.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "desc": "Shows a new vocabulary word on the back every day."},
    {"id": "sp_mug", "name": "Bonjour-Hola-你好 Ceramic Mug 350ml", "price": 12.99, "category": "Home", "sizes": [], "image": "https://images.pexels.com/photos/7192236/pexels-photo-7192236.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "desc": "Start every study session with a warm hello."},
    {"id": "sp_cap", "name": "LinguaConnect Classic Cap — Embroidered Logo", "price": 15.99, "category": "Apparel", "sizes": [], "image": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxjYXB8ZW58MHx8fHwxNzg1NDM2NjAwfDA&ixlib=rb-4.1.0&q=85", "desc": "One size fits all, adjustable strap."},
    {"id": "sp_cap2", "name": "Limited Edition Speak-Up Cap (Cream)", "price": 17.99, "category": "Apparel", "sizes": [], "image": "https://images.unsplash.com/photo-1691256676359-20e5c6d4bc92?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwyfHxjYXB8ZW58MHx8fHwxNzg1NDM2NjAwfDA&ixlib=rb-4.1.0&q=85", "desc": "Limited summer drop — soft cotton twill."},
    {"id": "sp_hoodie", "name": "【🔥 Promo】 White Long Sleeve Tee, Casual Crew Neck Cotton", "price": 29.99, "category": "Apparel", "sizes": ["S", "M", "L", "XL"], "image": "https://images.pexels.com/photos/8217544/pexels-photo-8217544.jpeg", "desc": "Cozy layering piece with a tiny logo on the chest."},
]
STORE_MAP = {p["id"]: p for p in STORE_PRODUCTS}
store_orders_col = _db["store_orders"]


class OrderItem(BaseModel):
    product_id: str
    qty: int = 1
    size: str | None = None


class OrderBody(BaseModel):
    items: list[OrderItem]
    name: str
    phone: str
    address: str


@router.get("/store")
async def store_products(current_user: CurrentUser):
    return {"products": STORE_PRODUCTS}


@router.post("/store/order")
async def place_order(body: OrderBody, current_user: CurrentUser):
    if not body.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    items = []
    total = 0.0
    for it in body.items:
        p = STORE_MAP.get(it.product_id)
        if not p:
            raise HTTPException(status_code=404, detail="Product not found")
        qty = max(1, min(it.qty, 20))
        total += p["price"] * qty
        items.append({"product_id": p["id"], "name": p["name"], "price": p["price"], "qty": qty, "size": it.size})
    order = {
        "_id": str(uuid.uuid4()),
        "user_id": current_user["_id"],
        "items": items,
        "total": round(total, 2),
        "name": body.name,
        "phone": body.phone,
        "address": body.address,
        "status": "pending",
        "payment": "Cash on Delivery",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await store_orders_col.insert_one(order)
    return {"ok": True, "order_id": order["_id"], "total": order["total"]}


@router.get("/store/orders")
async def my_orders(current_user: CurrentUser):
    docs = (
        await store_orders_col.find({"user_id": current_user["_id"]})
        .sort("created_at", -1)
        .to_list(50)
    )
    return [{k: v for k, v in d.items() if k != "user_id"} | {"id": d["_id"]} for d in docs]
