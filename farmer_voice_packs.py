"""
Farmer Dashboard Voice Packs & Translation Module
--------------------------------------------------
Derived from TraceCrop platform.
Manages multi-lingual voice prompts, translations, and audio generation
for Indian regional languages in the Farmer Dashboard.
"""

import os
import sys
import json
import glob
from typing import Dict, List, Optional

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Supported regional and national languages
SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "native": "English"},
    "hi": {"name": "Hindi", "native": "हिन्दी"},
    "ta": {"name": "Tamil", "native": "தமிழ்"},
    "te": {"name": "Telugu", "native": "తెలుగు"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ"},
    "ml": {"name": "Malayalam", "native": "മലയാളം"},
    "mr": {"name": "Marathi", "native": "मराठी"},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી"},
    "bn": {"name": "Bengali", "native": "বাংলা"},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ"},
    "ur": {"name": "Urdu", "native": "اردو"},
    "ne": {"name": "Nepali", "native": "नेपाली"}
}

# Base English prompt descriptions for Farmer Dashboard form fields
FARMER_BASE_PROMPTS = {
    "farmer.cropName": "Enter the crop name, for example wheat, tomato, or rice.",
    "farmer.cropVariety": "Enter the crop variety or type, for example organic or hybrid.",
    "farmer.sowingDate": "Select the sowing date when this crop was planted.",
    "farmer.farmLocation": "Enter your farm location, land ID, or location coordinates.",
    "farmer.fertilizers": "Optional. List any fertilizers or pesticides used for this crop.",
    "farmer.cropImage": "Optional. Upload a clear crop image from your device.",
    "farmer.transferDistributor": "Enter the distributor public ID shown in the distributor account, then press Transfer."
}

def load_prompts_data() -> Dict[str, Dict[str, str]]:
    """Loads prompt translations from farmer_prompts.json if available."""
    json_path = os.path.join(os.path.dirname(__file__), "farmer_prompts.json")
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

FARMER_TRANSLATIONS = load_prompts_data()

def get_farmer_prompt(key: str, lang: str = "en") -> str:
    """
    Returns the localized prompt string for a given field key and language.
    Falls back to English if the translation is not available.
    """
    if lang == "en":
        return FARMER_BASE_PROMPTS.get(key, "")
    field_trans = FARMER_TRANSLATIONS.get(key, {})
    return field_trans.get(lang, FARMER_BASE_PROMPTS.get(key, ""))

def get_audio_filename(key: str, lang: str) -> str:
    """Returns the standardized filename for a voice prompt."""
    safe_key = key.replace(".", "_")
    return f"{safe_key}_{lang}.mp3"

def verify_voice_packs(audio_dir: str = "public/voice-audio") -> Dict[str, any]:
    """
    Verifies the existence and integrity of all pre-recorded audio packs.
    """
    results = {
        "audio_dir": audio_dir,
        "total_expected": len(FARMER_BASE_PROMPTS) * (len(SUPPORTED_LANGUAGES) - 2),  # en and non-audio excluded
        "found_files": 0,
        "missing_files": [],
        "present_files": []
    }

    local_langs = ["te", "ta", "kn", "ml", "mr", "gu", "bn", "pa", "ur", "ne"]
    expected_count = len(FARMER_BASE_PROMPTS) * len(local_langs)
    results["total_expected"] = expected_count

    for key in FARMER_BASE_PROMPTS.keys():
        for lang in local_langs:
            filename = get_audio_filename(key, lang)
            filepath = os.path.join(audio_dir, filename)
            if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
                results["found_files"] += 1
                results["present_files"].append(filename)
            else:
                results["missing_files"].append(filename)

    results["is_complete"] = (results["found_files"] == expected_count)
    return results

def generate_voice_pack(key: str, lang: str, output_dir: str = "public/voice-audio") -> Optional[str]:
    """
    Generates a single MP3 audio prompt using gTTS (Google Text-to-Speech).
    Requires 'pip install gTTS'.
    """
    try:
        # pyrefly: ignore [missing-import]
        from gtts import gTTS
    except ImportError:
        print("[!] gTTS is not installed. Install via: pip install gTTS")
        return None

    text = get_farmer_prompt(key, lang)
    if not text:
        print(f"[!] No text found for key='{key}' lang='{lang}'")
        return None

    os.makedirs(output_dir, exist_ok=True)
    filename = get_audio_filename(key, lang)
    filepath = os.path.join(output_dir, filename)

    try:
        tts = gTTS(text=text, lang=lang, slow=False)
        tts.save(filepath)
        print(f"[✓] Generated: {filepath}")
        return filepath
    except Exception as e:
        print(f"[✗] Error generating {filename}: {e}")
        return None

def inject_google_translate(html_pattern: str = "public/*.html") -> int:
    """
    Injects Google Translate widget into target HTML files (TraceCrop add_translate logic).
    """
    snippet = """
<div id="google_translate_element"></div>
<script type="text/javascript">
function googleTranslateElementInit() {
  new google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element');
}
</script>
<script type="text/javascript" src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
</body>
"""
    updated_count = 0
    for f in glob.glob(html_pattern):
        with open(f, "r", encoding="utf-8") as file:
            content = file.read()

        if "googleTranslateElementInit" not in content and "</body>" in content:
            content = content.replace("</body>", snippet)
            with open(f, "w", encoding="utf-8") as file:
                file.write(content)
            print(f"[✓] Injected Google Translate into {f}")
            updated_count += 1
        else:
            print(f"[-] Skipped {f} (already has Google Translate or missing </body>)")
    return updated_count

if __name__ == "__main__":
    import sys

    print("==================================================================")
    print("🌾 Farmer Dashboard Voice Packs & Translation Module (TraceCrop)")
    print("==================================================================")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--verify":
        status = verify_voice_packs()
        print(f"Total Expected Voice Packs: {status['total_expected']}")
        print(f"Found Audio Files:         {status['found_files']}")
        print(f"Complete:                  {status['is_complete']}")
        if status["missing_files"]:
            print(f"Missing ({len(status['missing_files'])}): {status['missing_files'][:5]}...")
    elif len(sys.argv) > 1 and sys.argv[1] == "--translate":
        count = inject_google_translate()
        print(f"Injected translation widget into {count} pages.")
    else:
        print("Usage:")
        print("  python farmer_voice_packs.py --verify    : Verify existing farmer voice packs")
        print("  python farmer_voice_packs.py --translate : Inject Google Translate widget into HTML pages")
        print("\nSupported Languages:")
        for code, info in SUPPORTED_LANGUAGES.items():
            print(f"  {code:5} -> {info['name']} ({info['native']})")
        print("\nSample Prompt (farmer.cropName):")
        print("  EN :", get_farmer_prompt("farmer.cropName", "en"))
        print("  HI :", get_farmer_prompt("farmer.cropName", "hi"))
        print("  TE :", get_farmer_prompt("farmer.cropName", "te"))
        print("  TA :", get_farmer_prompt("farmer.cropName", "ta"))
