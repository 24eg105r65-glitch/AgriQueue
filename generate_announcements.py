"""
Generate greeting and announcement MP3s for all 9 languages
"""
import os
import time
from gtts import gTTS

ANNOUNCEMENTS = {
    "greet": {
        "hi": "AgriQueue (एग्रीकतार) की भाषा हिंदी में बदली गई।",
        "en": "AgriQueue language set to English.",
        "te": "AgriQueue భాష తెలుగులోకి మార్చబడింది.",
        "ta": "AgriQueue மொழி தமிழுக்கு மாற்றப்பட்டது.",
        "pa": "AgriQueue ਦੀ ਭਾਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲੀ ਗਈ।",
        "mr": "AgriQueue भाषा मराठीमध्ये बदलली.",
        "kn": "AgriQueue ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಗಿದೆ.",
        "bn": "AgriQueue এর ভাষা বাংলায় পরিবর্তন করা হয়েছে।",
        "gu": "AgriQueue ભાષા ગુજરાતીમાં બદલાઈ ગઈ છે."
    },
    "token_booked": {
        "hi": "खरीद स्लॉट बुक हो गया है। आपका डिजिटल टोकन जारी कर दिया गया है।",
        "en": "Procurement slot booked successfully. Your digital queue token is generated.",
        "te": "సేకరణ స్లాట్ బుక్ చేయబడింది. మీ డిజిటల్ క్యూ టోకెన్ జారీ చేయబడింది.",
        "ta": "கொள்முதல் ஸ்லாட் முன்பதிவு செய்யப்பட்டது. உங்கள் டிஜிட்டல் டோக்கன் உருவாக்கப்பட்டது.",
        "pa": "ਖਰੀਦ ਸਲਾਟ ਬੁੱਕ ਹੋ ਗਿਆ ਹੈ। ਤੁਹਾਡਾ ਡਿਜੀਟਲ ਟੋਕਨ ਜਾਰੀ ਹੋ ਗਿਆ ਹੈ।",
        "mr": "खरेदी स्लॉट बुक झाला आहे. तुमचे डिजिटल टोकन तयार झाले आहे.",
        "kn": "ಖರೀದಿ ಸ್ಲಾಟ್ ಬುಕ್ ಆಗಿದೆ. ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಸರದಿ ಟೋಕನ್ ಸೃಷ್ಟಿಯಾಗಿದೆ.",
        "bn": "সংগ্রহ স্লট বুক হয়েছে। আপনার ডিজিটাল টোকেন তৈরি করা হয়েছে।",
        "gu": "ખરીદી સ્લોટ બુક થઈ ગયો છે. તમારું ડિજિટલ ટોકન જનરેટ થઈ ગયું છે."
    }
}

OUTPUT_DIR = "public/voice-audio"
os.makedirs(OUTPUT_DIR, exist_ok=True)

for key, lang_map in ANNOUNCEMENTS.items():
    for lang, text in lang_map.items():
        filename = f"{key}_{lang}.mp3"
        filepath = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            continue
        try:
            print(f"Generating announcement: {filename}...")
            tts = gTTS(text=text, lang=lang, slow=False)
            tts.save(filepath)
            time.sleep(0.3)
        except Exception as e:
            print(f"Error {filename}: {e}")

print("Announcement voice packs generated successfully!")
