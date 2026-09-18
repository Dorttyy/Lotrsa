from db import config_col

DEFAULTS = {
    "free_translations_per_day": 100,
    "free_rooms_per_day": 1,
    "free_new_chats_per_day": 10,
    "vip_new_chats_per_day": 25,
    "app_name": "Mello",
}


async def get_app_config() -> dict:
    doc = await config_col.find_one({"_id": "app"}) or {}
    return {**DEFAULTS, **{k: v for k, v in doc.items() if k != "_id"}}
