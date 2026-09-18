"""Explicit supported targets: never silently translate an unknown locale to English."""
import re
import unicodedata

LANGUAGES = {
    "en": "English", "zh-CN": "Chinese (Simplified)", "zh-TW": "Chinese (Traditional)",
    "ja": "Japanese", "ko": "Korean", "bn": "Bengali", "ur": "Urdu", "hi": "Hindi",
    "ar": "Arabic", "es": "Spanish", "pt": "Portuguese", "pt-BR": "Portuguese (Brazil)",
    "de": "German", "fr": "French", "id": "Indonesian", "it": "Italian", "ru": "Russian",
    "tr": "Turkish", "vi": "Vietnamese", "th": "Thai", "ms": "Malay", "tl": "Filipino",
    "fa": "Persian", "ps": "Pashto", "he": "Hebrew", "uk": "Ukrainian", "pl": "Polish",
    "nl": "Dutch", "sv": "Swedish", "da": "Danish", "no": "Norwegian", "fi": "Finnish",
    "el": "Greek", "ro": "Romanian", "hu": "Hungarian", "cs": "Czech", "sk": "Slovak",
    "bg": "Bulgarian", "sr": "Serbian", "hr": "Croatian", "bs": "Bosnian", "sq": "Albanian",
    "ta": "Tamil", "te": "Telugu", "kn": "Kannada", "ml": "Malayalam", "mr": "Marathi",
    "gu": "Gujarati", "pa": "Punjabi", "ne": "Nepali", "si": "Sinhala", "my": "Burmese",
    "km": "Khmer", "lo": "Lao", "mn": "Mongolian", "kk": "Kazakh", "uz": "Uzbek",
    "az": "Azerbaijani", "ka": "Georgian", "hy": "Armenian", "sw": "Swahili",
    "af": "Afrikaans", "am": "Amharic", "so": "Somali", "ha": "Hausa", "yo": "Yoruba",
    "ig": "Igbo", "zu": "Zulu", "et": "Estonian", "lv": "Latvian", "lt": "Lithuanian",
    "ca": "Catalan", "ga": "Irish", "cy": "Welsh", "is": "Icelandic", "eo": "Esperanto",
}
RTL_CODES = {"ar", "ur", "fa", "he", "ps"}


def _key(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).strip().casefold().replace("_", "-").split())


ALIASES = {_key(name): code for code, name in LANGUAGES.items()}
ALIASES.update({_key(code): code for code in LANGUAGES})
ALIASES.update({
    "zh": "zh-CN", "chinese": "zh-CN", "mandarin": "zh-CN", "中文": "zh-CN", "简体中文": "zh-CN",
    "simplified chinese": "zh-CN", "zh-hans": "zh-CN", "zh-sg": "zh-CN", "zh-hans-cn": "zh-CN",
    "traditional chinese": "zh-TW", "繁體中文": "zh-TW", "zh-hant": "zh-TW", "zh-hk": "zh-TW", "zh-hant-tw": "zh-TW",
    "বাংলা": "bn", "bangla": "bn", "bengali (bangla)": "bn", "বাংলা ভাষা": "bn",
    "اردو": "ur", "हिन्दी": "hi", "हिंदी": "hi", "العربية": "ar", "arab": "ar",
    "日本語": "ja", "한국어": "ko", "español": "es", "português": "pt", "português (brasil)": "pt-BR",
    "brazilian portuguese": "pt-BR", "pt-pt": "pt", "français": "fr", "france": "fr",
    "deutsch": "de", "germany": "de", "bahasa indonesia": "id", "indonesian bahasa": "id", "in": "id",
    "farsi": "fa", "فارسی": "fa", "עברית": "he", "iw": "he", "fil": "tl", "tagalog": "tl", "nb": "no",
})


def normalize_language(value: str, *, allow_auto: bool = False) -> str:
    key = _key(value)
    if key == "auto" and allow_auto:
        return "auto"
    if key in ALIASES:
        return ALIASES[key]
    # Valid regional tags of a supported base (en-US, ar-SA, bn-BD, etc.).
    if re.fullmatch(r"[a-z]{2,3}(?:-[a-z0-9]{2,8})+", key):
        base = key.split("-", 1)[0]
        if base != "zh" and base in LANGUAGES:
            return base
    raise ValueError("Choose a supported translation language.")