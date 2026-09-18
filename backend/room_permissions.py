from fastapi import HTTPException


def can_manage(doc: dict, uid: str) -> bool:
    return doc["host_id"] == uid or (uid in doc.get("moderators", []) and uid in doc.get("members", {}))


def require_manager(doc: dict, uid: str):
    if not can_manage(doc, uid):
        raise HTTPException(403, "Only the host or an active moderator can do this.")


def protect_member(doc: dict, actor: str, target: str):
    if target == doc["host_id"]:
        raise HTTPException(403, "The room owner cannot be moderated.")
    if actor != doc["host_id"] and target != actor and target in doc.get("moderators", []):
        raise HTTPException(403, "Only the host can manage another moderator.")


def manager_query(uid: str):
    return {"$or": [{"host_id": uid}, {"moderators": uid, f"members.{uid}": {"$exists": True}}]}