"""Shared discovery/random-match preferences; no sensitive profile data returned."""
from typing import Literal

from pydantic import BaseModel, Field


class PracticeFilters(BaseModel):
    country: str = Field(default="", max_length=100)
    native_language: Literal["", "en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ru", "ar", "hi", "bn", "tr", "nl", "pl", "sv", "vi", "th", "id", "el"] = ""
    gender: Literal["", "male", "female", "other"] = ""
    age_group: Literal["", "13-17", "18-24", "25-34", "35-44", "45+"] = ""
    level: Literal["", "Beginner", "Elementary", "Intermediate", "Advanced", "Fluent"] = ""
    has_avatar: bool = False


def matches_filters(peer: dict, raw: dict, practice_language: str = "all") -> bool:
    f = PracticeFilters(**raw)
    if f.country and (peer.get("country") or "").strip().casefold() != f.country.strip().casefold():
        return False
    if f.native_language and peer.get("native_language") != f.native_language:
        return False
    if f.gender and (peer.get("gender") or "").casefold() != f.gender:
        return False
    if f.age_group:
        age = peer.get("age")
        if not isinstance(age, int):
            return False
        lower, upper = (45, 120) if f.age_group == "45+" else map(int, f.age_group.split("-"))
        if not lower <= age <= upper:
            return False
    if f.level:
        levels = peer.get("proficiencies") or {}
        level = levels.get(practice_language) if practice_language != "all" else None
        if (level or peer.get("proficiency") or "").casefold() != f.level.casefold():
            return False
    return not f.has_avatar or bool(peer.get("avatar_url"))