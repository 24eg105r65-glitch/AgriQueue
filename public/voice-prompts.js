(function () {
  const STYLE_ID = "tracecrop-voice-prompt-styles";
  const CONTROL_SELECTOR = "input[data-speech], textarea[data-speech], select[data-speech]";

  const SPEECH_LANGS = {
    en: "en-US",
    hi: "hi-IN",
    ta: "ta-IN",
    te: "te-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    mr: "mr-IN",
    gu: "gu-IN",
    bn: "bn-IN",
    pa: "pa-IN",
    ur: "ur-IN",
    ne: "ne-NP",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    ar: "ar-SA",
    id: "id-ID",
    ja: "ja-JP",
    ko: "ko-KR",
    pt: "pt-BR",
    ru: "ru-RU",
    th: "th-TH",
    vi: "vi-VN",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW"
  };

  const GOOGLE_TTS_LANGS = {
    en: "en",
    hi: "hi",
    ta: "ta",
    te: "te",
    kn: "kn",
    ml: "ml",
    mr: "mr",
    gu: "gu",
    bn: "bn",
    pa: "pa",
    ur: "ur",
    ne: "ne",
    es: "es",
    fr: "fr",
    de: "de",
    ar: "ar",
    id: "id",
    ja: "ja",
    ko: "ko",
    pt: "pt",
    ru: "ru",
    th: "th",
    vi: "vi",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW"
  };

  const PROMPT_TRANSLATIONS = {
    "farmer.cropName": {
      hi: "फसल का नाम दर्ज करें।",
      ta: "பயிரின் பெயரை உள்ளிடவும்.",
      te: "పంట పేరును నమోదు చేయండి.",
      kn: "ಬೆಳೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.",
      ml: "വിളയുടെ പേര് നൽകുക.",
      mr: "पिकाचे नाव प्रविष्ट करा.",
      gu: "પાકનું નામ દાખલ કરો.",
      bn: "ফসলের নাম লিখুন।",
      ne: "फसलको नाम प्रविष्ट गर्नुहोस्, उदाहरणका लागि गहुँ, टमाटर, वा चामल।",
      pa: "ਫਸਲ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ।",
      ur: "فصل کا نام درج کریں۔"
    },
    "farmer.cropVariety": {
      hi: "फसल की किस्म या प्रकार दर्ज करें।",
      ta: "பயிரின் வகை அல்லது ரகத்தை உள்ளிடவும்.",
      te: "పంట రకం లేదా వెరైటీని నమోదు చేయండి.",
      kn: "ಬೆಳೆಯ ಜಾತಿ ಅಥವಾ ಪ್ರಕಾರವನ್ನು ನಮೂದಿಸಿ.",
      ml: "വിളയുടെ ഇനം അല്ലെങ്കിൽ തരം നൽകുക.",
      mr: "पिकाची जात किंवा प्रकार प्रविष्ट करा.",
      gu: "પાકની જાત અથવા પ્રકાર દાખલ કરો.",
      bn: "ফসলের জাত বা ধরন লিখুন।",
      ne: "फसलको विविधता वा प्रकार प्रविष्ट गर्नुहोस्, उदाहरणका लागि जैविक वा हाइब्रिड।",
      pa: "ਫਸਲ ਦੀ ਕਿਸਮ ਜਾਂ ਵਰਾਇਟੀ ਦਰਜ ਕਰੋ।",
      ur: "فصل کی قسم درج کریں۔"
    },
    "farmer.sowingDate": {
      hi: "बुवाई की तारीख चुनें।",
      ta: "விதைத்த தேதியைத் தேர்ந்தெடுக்கவும்.",
      te: "విత్తిన తేదీని ఎంచుకోండి.",
      kn: "ಬಿತ್ತಿದ ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      ml: "വിതച്ച തീയതി തിരഞ്ഞെടുക്കുക.",
      mr: "पेरणीची तारीख निवडा.",
      gu: "વાવણીની તારીખ પસંદ કરો.",
      bn: "বপনের তারিখ নির্বাচন করুন।",
      ne: "यो बाली रोपेको बेला रोप्ने मिति चयन गर्नुहोस्।",
      pa: "ਬਿਜਾਈ ਦੀ ਮਿਤੀ ਚੁਣੋ।",
      ur: "بوائی کی تاریخ منتخب کریں۔"
    },
    "farmer.farmLocation": {
      hi: "खेत का स्थान या भूमि आईडी दर्ज करें।",
      ta: "பண்ணை இருப்பிடம் அல்லது நில ஐடியை உள்ளிடவும்.",
      te: "పొలం స్థానం లేదా భూమి ఐడీని నమోదు చేయండి.",
      kn: "ತೋಟದ ಸ್ಥಳ ಅಥವಾ ಭೂಮಿ ಐಡಿಯನ್ನು ನಮೂದಿಸಿ.",
      ml: "ഫാം സ്ഥലം അല്ലെങ്കിൽ ഭൂമി ഐഡി നൽകുക.",
      mr: "शेताचे ठिकाण किंवा जमीन आयडी प्रविष्ट करा.",
      gu: "ખેતરનું સ્થાન અથવા જમીન ID દાખલ કરો.",
      bn: "খামারের অবস্থান বা জমির আইডি লিখুন।",
      ne: "आफ्नो खेत स्थान, भूमि आईडी, वा स्थान निर्देशांक प्रविष्ट गर्नुहोस्।",
      pa: "ਖੇਤ ਦਾ ਸਥਾਨ ਜਾਂ ਜ਼ਮੀਨ ਆਈਡੀ ਦਰਜ ਕਰੋ।",
      ur: "فارم کا مقام یا زمین آئی ڈی درج کریں۔"
    },
    "farmer.fertilizers": {
      hi: "वैकल्पिक: इस्तेमाल किए गए उर्वरक या कीटनाशक दर्ज करें।",
      ta: "விருப்பம்: பயன்படுத்திய உரங்கள் அல்லது பூச்சிக்கொல்லிகளை உள்ளிடவும்.",
      te: "ఐచ్చికం: వాడిన ఎరువులు లేదా పురుగుమందులను నమోదు చేయండి.",
      kn: "ಐಚ್ಛಿಕ: ಬಳಸಿದ ರಸಗೊಬ್ಬರಗಳು ಅಥವಾ ಕೀಟನಾಶಕಗಳನ್ನು ನಮೂದಿಸಿ.",
      ml: "ഐച്ഛികം: ഉപയോഗിച്ച വളങ്ങൾ അല്ലെങ്കിൽ കീടനാശിനികൾ നൽകുക.",
      mr: "ऐच्छिक: वापरलेली खते किंवा कीटकनाशके प्रविष्ट करा.",
      gu: "વૈકલ્પિક: ઉપયોગમાં લીધેલા ખાતર અથવા જંતુનાશક દાખલ કરો.",
      bn: "ঐচ্ছিক: ব্যবহৃত সার বা কীটনাশক লিখুন।",
      ne: "ऐच्छिक। यस बालीको लागि प्रयोग गरिने कुनै पनि मल वा कीटनाशकहरू सूचीबद्ध गर्नुहोस्।",
      pa: "ਵਿਕਲਪਿਕ: ਵਰਤੇ ਖਾਦ ਜਾਂ ਕੀਟਨਾਸ਼ਕ ਦਰਜ ਕਰੋ।",
      ur: "اختیاری: استعمال شدہ کھاد یا کیڑے مار دوا درج کریں۔"
    },
    "farmer.cropImage": {
      hi: "वैकल्पिक: फसल की तस्वीर अपलोड करें।",
      ta: "விருப்பம்: பயிர் படத்தை பதிவேற்றவும்.",
      te: "ఐచ్చికం: పంట చిత్రాన్ని అప్లోడ్ చేయండి.",
      kn: "ಐಚ್ಛಿಕ: ಬೆಳೆಯ ಚಿತ್ರವನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ.",
      ml: "ഐച്ഛികം: വിളയുടെ ചിത്രം അപ്ലോഡ് ചെയ്യുക.",
      mr: "ऐच्छिक: पिकाचा फोटो अपलोड करा.",
      gu: "વૈકલ્પિક: પાકનું ચિત્ર અપલોડ કરો.",
      bn: "ঐচ্ছিক: ফসলের ছবি আপলোড করুন।",
      ne: "ऐच्छिक। आफ्नो यन्त्रबाट स्पष्ट क्रप छवि अपलोड गर्नुहोस्।",
      pa: "ਵਿਕਲਪਿਕ: ਫਸਲ ਦੀ ਤਸਵੀਰ ਅੱਪਲੋਡ ਕਰੋ।",
      ur: "اختیاری: فصل کی تصویر اپ لوڈ کریں۔"
    },
    "farmer.transferDistributor": {
      hi: "वितरक की सार्वजनिक आईडी दर्ज करें।",
      ta: "விநியோகஸ்தரின் பொது ஐடியை உள்ளிடவும்.",
      te: "డిస్ట్రిబ్యూటర్ పబ్లిక్ ఐడీని నమోదు చేయండి.",
      kn: "ವಿತರಕರ ಸಾರ್ವಜನಿಕ ಐಡಿಯನ್ನು ನಮೂದಿಸಿ.",
      ml: "വിതരണക്കാരന്റെ പൊതു ഐഡി നൽകുക.",
      mr: "वितरकाचा सार्वजनिक आयडी प्रविष्ट करा.",
      gu: "વિતરકનું જાહેર ID દાખલ કરો.",
      bn: "ডিস্ট্রিবিউটরের পাবলিক আইডি লিখুন।",
      ne: "वितरक खातामा देखाइएको वितरक सार्वजनिक आईडी प्रविष्ट गर्नुहोस्, त्यसपछि स्थानान्तरण थिच्नुहोस्।",
      pa: "ਵਿਤਰਕ ਦੀ ਪਬਲਿਕ ਆਈਡੀ ਦਰਜ ਕਰੋ।",
      ur: "ڈسٹری بیوٹر کی پبلک آئی ڈی درج کریں۔"
    },
    "distributor.shipmentLocation": {
      hi: "शिपमेंट का वर्तमान स्थान दर्ज करें।",
      ta: "சரக்கின் தற்போதைய இருப்பிடத்தை உள்ளிடவும்.",
      te: "రవాణా ప్రస్తుత స్థానాన్ని నమోదు చేయండి.",
      kn: "ಸಾಗಣೆಯ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ನಮೂದಿಸಿ.",
      ml: "ഷിപ്പ്മെന്റിന്റെ നിലവിലെ സ്ഥലം നൽകുക.",
      mr: "शिपमेंटचे सध्याचे ठिकाण प्रविष्ट करा.",
      gu: "શિપમેન્ટનું વર્તમાન સ્થાન દાખલ કરો.",
      bn: "চালানের বর্তমান অবস্থান লিখুন।",
      ne: "ढुवानीको हालको स्थान वा निर्देशांकहरू प्रविष्ट गर्नुहोस्।",
      pa: "ਸ਼ਿਪਮੈਂਟ ਦਾ ਮੌਜੂਦਾ ਸਥਾਨ ਦਰਜ ਕਰੋ।",
      ur: "شپمنٹ کا موجودہ مقام درج کریں۔"
    },
    "distributor.shipmentStatus": {
      hi: "शिपमेंट की वर्तमान स्थिति चुनें।",
      ta: "சரக்கின் தற்போதைய நிலையைத் தேர்ந்தெடுக்கவும்.",
      te: "రవాణా ప్రస్తుత స్థితిని ఎంచుకోండి.",
      kn: "ಸಾಗಣೆಯ ಪ್ರಸ್ತುತ ಸ್ಥಿತಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      ml: "ഷിപ്പ്മെന്റിന്റെ നിലവിലെ നില തിരഞ്ഞെടുക്കുക.",
      mr: "शिपमेंटची सध्याची स्थिती निवडा.",
      gu: "શિપમેન્ટની વર્તમાન સ્થિતિ પસંદ કરો.",
      bn: "চালানের বর্তমান অবস্থা নির্বাচন করুন।",
      ne: "हालको ढुवानी स्थिति छान्नुहोस्।",
      pa: "ਸ਼ਿਪਮੈਂਟ ਦੀ ਮੌਜੂਦਾ ਸਥਿਤੀ ਚੁਣੋ।",
      ur: "شپمنٹ کی موجودہ حالت منتخب کریں۔"
    },
    "distributor.temperature": {
      hi: "सेल्सियस में तापमान दर्ज करें।",
      ta: "செல்சியஸில் வெப்பநிலையை உள்ளிடவும்.",
      te: "సెల్సియస్‌లో ఉష్ణోగ్రతను నమోదు చేయండి.",
      kn: "ಸೆಲ್ಸಿಯಸ್‌ನಲ್ಲಿ ತಾಪಮಾನವನ್ನು ನಮೂದಿಸಿ.",
      ml: "സെൽഷ്യസിൽ താപനില നൽകുക.",
      mr: "सेल्सियसमध्ये तापमान प्रविष्ट करा.",
      gu: "સેલ્સિયસમાં તાપમાન દાખલ કરો.",
      bn: "সেলসিয়াসে তাপমাত্রা লিখুন।",
      ne: "डिग्री सेल्सियसमा हालको तापक्रम प्रविष्ट गर्नुहोस्।",
      pa: "ਸੈਲਸੀਅਸ ਵਿੱਚ ਤਾਪਮਾਨ ਦਰਜ ਕਰੋ।",
      ur: "سیلسیس میں درجہ حرارت درج کریں۔"
    },
    "distributor.humidity": {
      hi: "आर्द्रता प्रतिशत दर्ज करें।",
      ta: "ஈரப்பத சதவீதத்தை உள்ளிடவும்.",
      te: "తేమ శాతాన్ని నమోదు చేయండి.",
      kn: "ಆರ್ದ್ರತೆ ಶೇಕಡಾವಾರನ್ನು ನಮೂದಿಸಿ.",
      ml: "ഈർപ്പം ശതമാനം നൽകുക.",
      mr: "आर्द्रतेची टक्केवारी प्रविष्ट करा.",
      gu: "ભેજની ટકાવારી દાખલ કરો.",
      bn: "আর্দ্রতার শতাংশ লিখুন।",
      ne: "हालको आर्द्रता प्रतिशत प्रविष्ट गर्नुहोस्।",
      pa: "ਨਮੀ ਦਾ ਪ੍ਰਤੀਸ਼ਤ ਦਰਜ ਕਰੋ।",
      ur: "نمی کا فیصد درج کریں۔"
    }
  };

  let voiceCopyId = 0;
  let availableVoices = [];
  let currentAudio = null;

  function getAudioPlayer() {
    if (currentAudio && document.body.contains(currentAudio)) return currentAudio;

    currentAudio = document.createElement("audio");
    currentAudio.id = "tracecrop-voice-audio";
    currentAudio.preload = "auto";
    currentAudio.controls = true;
    currentAudio.setAttribute("playsinline", "");
    currentAudio.style.position = "fixed";
    currentAudio.style.right = "16px";
    currentAudio.style.bottom = "92px";
    currentAudio.style.width = "280px";
    currentAudio.style.height = "36px";
    currentAudio.style.zIndex = "5200";
    currentAudio.style.opacity = "0";
    currentAudio.style.pointerEvents = "none";
    document.body.appendChild(currentAudio);
    return currentAudio;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .tracecrop-voice-label-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
      }
      .tracecrop-voice-label-row label {
        margin-bottom: 0 !important;
      }
      .tracecrop-voice-btn {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        border: 1px solid rgba(78, 222, 163, 0.3);
        background: rgba(78, 222, 163, 0.1);
        color: #4edea3;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
      }
      .tracecrop-voice-btn:hover,
      .tracecrop-voice-btn:focus-visible {
        background: #4edea3;
        border-color: #4edea3;
        color: #003824;
        outline: none;
      }
      .tracecrop-voice-btn:active {
        transform: scale(0.94);
      }
      .tracecrop-voice-btn.is-speaking {
        background: #4edea3;
        color: #003824;
        box-shadow: 0 0 0 4px rgba(78, 222, 163, 0.16);
      }
      .tracecrop-voice-btn .material-symbols-outlined {
        font-size: 18px;
        line-height: 1;
      }
      .tracecrop-voice-copy {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      .tracecrop-voice-inline-wrap {
        position: relative;
        display: block;
        min-width: 0;
      }
      .tracecrop-voice-input-pad {
        padding-right: 2.75rem !important;
      }
      .tracecrop-voice-inline-btn {
        position: absolute;
        top: 50%;
        right: 0.35rem;
        transform: translateY(-50%);
      }
      .tracecrop-voice-inline-btn:active {
        transform: translateY(-50%) scale(0.94);
      }
    `;
    document.head.appendChild(style);
  }

  function refreshVoices() {
    if (!("speechSynthesis" in window)) return;
    availableVoices = window.speechSynthesis.getVoices();
  }

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function normalizeTranslateLanguage(value) {
    if (!value) return "en";

    let lang = String(value).trim();
    if (lang.includes("/")) {
      const parts = lang.split("/").filter(Boolean);
      lang = parts[parts.length - 1] || lang;
    }

    lang = decodeURIComponent(lang).replace("_", "-").toLowerCase();
    if (lang === "auto" || lang === "select language") return "en";
    if (lang === "iw") return "he";
    if (lang === "jw") return "jv";
    if (lang === "tl") return "fil";
    if (lang.startsWith("zh-cn") || lang === "zh") return "zh-cn";
    if (lang.startsWith("zh-tw")) return "zh-tw";
    return lang;
  }

  function getCookie(name) {
    return document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(name + "="))
      ?.slice(name.length + 1) || "";
  }

  function getSelectedLanguage() {
    const combo = document.querySelector("#google_translate_element select.goog-te-combo, .goog-te-combo");
    if (combo && combo.value) return normalizeTranslateLanguage(combo.value);

    const cookieLanguage = getCookie("googtrans");
    if (cookieLanguage) return normalizeTranslateLanguage(cookieLanguage);

    return "en";
  }

  function getSpeechLang(language) {
    const base = language.split("-")[0];
    return SPEECH_LANGS[language] || SPEECH_LANGS[base] || language;
  }

  function getGoogleTtsLang(language) {
    const base = language.split("-")[0];
    return GOOGLE_TTS_LANGS[language] || GOOGLE_TTS_LANGS[base] || base || "en";
  }

  function getLocalAudioUrl(key, language) {
    if (!key) return "";

    const lang = getGoogleTtsLang(language);
    const localLangs = ["te", "ta", "kn", "ml", "mr", "gu", "bn", "pa", "ur", "ne"];
    if (!localLangs.includes(lang)) return "";

    const safeKey = key.replace(/[^a-z0-9]+/gi, "_");
    return `voice-audio/${safeKey}_${lang}.mp3`;
  }

  function getPromptTranslation(key, language) {
    if (!key || !PROMPT_TRANSLATIONS[key]) return "";
    const base = language.split("-")[0];
    return PROMPT_TRANSLATIONS[key][language] || PROMPT_TRANSLATIONS[key][base] || "";
  }

  function findLabel(control) {
    if (control.dataset.voiceLabelId) {
      const existingLabel = document.getElementById(control.dataset.voiceLabelId);
      if (existingLabel) return existingLabel;
    }

    if (control.id) {
      const explicitLabel = document.querySelector(`label[for="${control.id}"]`);
      if (explicitLabel) return explicitLabel;
    }

    const parent = control.parentElement;
    if (!parent) return null;

    const children = Array.from(parent.children);
    const controlIndex = children.indexOf(control);
    for (let i = controlIndex - 1; i >= 0; i -= 1) {
      if (children[i].tagName === "LABEL") return children[i];
    }

    return Array.from(parent.children).find((child) => child.tagName === "LABEL") || null;
  }

  function getFallbackText(control) {
    const copy = control.dataset.voiceCopyId ? document.getElementById(control.dataset.voiceCopyId) : null;
    const basePrompt = control.getAttribute("data-speech") || "";
    const copyText = copy ? copy.textContent.trim() : "";
    const language = getSelectedLanguage();

    if (language !== "en" && copyText && copyText !== basePrompt) {
      return copyText;
    }

    const label = findLabel(control);
    const labelText = label ? label.textContent.trim() : "";
    const placeholder = control.getAttribute("placeholder") || "";
    return basePrompt || [labelText, placeholder].filter(Boolean).join(". ");
  }

  function chooseVoice(lang) {
    if (!("speechSynthesis" in window)) return null;

    const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();
    const normalized = lang.toLowerCase();
    const base = normalized.split("-")[0];

    return voices.find((voice) => voice.lang.toLowerCase() === normalized)
      || voices.find((voice) => voice.lang.toLowerCase().startsWith(base + "-"))
      || voices.find((voice) => voice.lang.toLowerCase().includes(base))
      || null;
  }

  function setActiveButton(button) {
    document.querySelectorAll(".tracecrop-voice-btn.is-speaking").forEach((activeButton) => {
      activeButton.classList.remove("is-speaking");
    });

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    button.classList.add("is-speaking");
  }

  function clearActiveButton(button) {
    button.classList.remove("is-speaking");
  }

  function playRemoteSpeech(text, language, button, key = "") {
    if (!("Audio" in window)) {
      window.showTraceCropNotification?.("Voice prompts are not supported in this browser.", { title: "Voice Prompt" });
      return;
    }

    setActiveButton(button);

    const ttsLang = getGoogleTtsLang(language);
    const params = new URLSearchParams({
      ie: "UTF-8",
      client: "gtx",
      tl: ttsLang,
      q: text
    });
    const audio = getAudioPlayer();
    const localAudioUrl = getLocalAudioUrl(key, language);
    const remoteAudioUrl = `https://translate.googleapis.com/translate_tts?${params.toString()}`;
    const audioUrl = localAudioUrl || remoteAudioUrl;
    audio.innerHTML = "";
    audio.src = audioUrl;
    audio.referrerPolicy = "no-referrer";

    audio.onended = () => clearActiveButton(button);
    audio.onerror = () => {
      if (localAudioUrl && audio.src.includes(localAudioUrl)) {
        audio.src = remoteAudioUrl;
        audio.load();
        audio.play().catch((error) => {
          clearActiveButton(button);
          console.error("TraceCrop remote voice fallback blocked", {
            language,
            ttsLang,
            remoteAudioUrl,
            errorName: error?.name,
            errorMessage: error?.message
          });
        });
        return;
      }

      clearActiveButton(button);
      console.error("TraceCrop voice audio failed", {
        language,
        ttsLang,
        audioUrl,
        networkState: audio.networkState,
        readyState: audio.readyState,
        error: audio.error
      });
      window.showTraceCropNotification?.(
        `Could not load the ${ttsLang} voice. Check your internet connection or try Chrome/Edge.`,
        { title: "Voice Prompt" }
      );
    };

    audio.load();
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch((error) => {
        clearActiveButton(button);
        console.error("TraceCrop voice playback blocked", {
          language,
          ttsLang,
          audioUrl,
          errorName: error?.name,
          errorMessage: error?.message
        });
        audio.style.opacity = "1";
        audio.style.pointerEvents = "auto";
        window.showTraceCropNotification?.(
          `Audio blocked by browser: ${error?.name || "permission"}. Use the audio control that appeared.`,
          { title: "Voice Prompt" }
        );
      });
    }
  }

  function playNativeSpeech(text, speechLang, voice, language, button) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang;
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.voice = voice;

    setActiveButton(button);
    utterance.onend = () => clearActiveButton(button);
    utterance.onerror = () => playRemoteSpeech(text, language, button);
    window.speechSynthesis.speak(utterance);
  }

  function speak(control, button) {
    const language = getSelectedLanguage();
    const key = control.getAttribute("data-speech-key");
    const text = getPromptTranslation(key, language) || getFallbackText(control);
    if (!text) return;

    const baseLanguage = language.split("-")[0];
    if (baseLanguage !== "en" && baseLanguage !== "hi") {
      playRemoteSpeech(text, language, button, key);
      return;
    }

    const speechLang = getSpeechLang(language);
    const canUseNativeSpeech = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    const voice = canUseNativeSpeech ? chooseVoice(speechLang) : null;

    if (voice) {
      playNativeSpeech(text, speechLang, voice, language, button);
      return;
    }

    playRemoteSpeech(text, language, button);
  }

  function buildButton(control) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tracecrop-voice-btn";
    button.setAttribute("aria-label", "Read this field aloud");
    button.setAttribute("title", "Read this field aloud");
    button.setAttribute("translate", "no");
    button.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true" translate="no">volume_up</span>';
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      speak(control, button);
    });
    return button;
  }

  function buildCopy(control) {
    const copy = document.createElement("span");
    copy.id = `tracecrop-voice-copy-${++voiceCopyId}`;
    copy.className = "tracecrop-voice-copy";
    copy.setAttribute("aria-hidden", "true");
    copy.textContent = control.getAttribute("data-speech") || "";
    control.dataset.voiceCopyId = copy.id;
    return copy;
  }

  function enhanceControl(control) {
    if (control.dataset.voiceEnhanced === "true") return;

    const button = buildButton(control);
    const copy = buildCopy(control);
    const label = findLabel(control);

    control.dataset.voiceEnhanced = "true";

    if (label) {
      if (!label.id) label.id = `tracecrop-voice-label-${voiceCopyId}`;
      control.dataset.voiceLabelId = label.id;

      let row = label.parentElement;
      if (!row || !row.classList.contains("tracecrop-voice-label-row")) {
        row = document.createElement("div");
        row.className = "tracecrop-voice-label-row";
        label.parentNode.insertBefore(row, label);
        row.appendChild(label);
      }
      row.appendChild(button);
      row.appendChild(copy);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "tracecrop-voice-inline-wrap";
    control.parentNode.insertBefore(wrapper, control);
    wrapper.appendChild(control);
    control.classList.add("tracecrop-voice-input-pad");
    button.classList.add("tracecrop-voice-inline-btn");
    wrapper.appendChild(button);
    wrapper.appendChild(copy);
  }

  function enhance(root = document) {
    ensureStyles();
    root.querySelectorAll(CONTROL_SELECTOR).forEach(enhanceControl);
  }

  if ("speechSynthesis" in window) {
    refreshVoices();
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    } else {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }

  window.TraceCropVoicePrompts = {
    enhance,
    getSelectedLanguage,
    speak
  };

  ready(() => enhance(document));
})();
