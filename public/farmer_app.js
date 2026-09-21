/**
 * AgriQueue: Smart Farmer Procurement & Queue Management Platform (SIH26032)
 * Complete Multilingual Voice Engine & Full UI Localization (9 Indian Languages)
 * Authentication (Login/Signup) + Geolocation-Based Nearest Procurement Centre Discovery
 */

(function () {
  // Government Minimum Support Price (MSP) 2026 Reference
  const CROPS_MSP = {
    paddy_a: { name: "Paddy (Grade A)", nameHi: "धान ग्रेड-ए (Paddy Grade A)", msp: 2300, maxMoisture: 14.0 },
    wheat: { name: "Wheat (FAQ Sharbati)", nameHi: "गेहूँ (Wheat FAQ)", msp: 2275, maxMoisture: 12.0 },
    maize: { name: "Maize (Hybrid)", nameHi: "मक्का (Maize Hybrid)", msp: 2090, maxMoisture: 14.0 },
    chana: { name: "Chana (Gram / Chickpea)", nameHi: "चना (Gram)", msp: 5440, maxMoisture: 12.0 },
    mustard: { name: "Mustard (Sarson)", nameHi: "सरसों (Mustard)", msp: 5650, maxMoisture: 8.0 }
  };

  // Multilingual Crop Translation Dictionary across all 9 Indian Languages
  const CROP_TRANSLATIONS = {
    paddy_a: {
      en: "Paddy (Grade A)",
      hi: "धान ग्रेड-ए (Paddy Grade A)",
      te: "వరి (గ్రేడ్-ఎ)",
      ta: "நெல் (கிரேடு-ஏ)",
      pa: "ਝੋਨਾ (ਗ੍ਰੇਡ-ਏ)",
      mr: "धान / भात (ग्रेड-ए)",
      kn: "ಭತ್ತ (ಗ್ರೇಡ್-ಎ)",
      bn: "ধান (গ্রেড-এ)",
      gu: "ડાંગર (ગ્રેડ-એ)"
    },
    wheat: {
      en: "Wheat (FAQ Sharbati)",
      hi: "गेहूँ (Wheat FAQ)",
      te: "గోధుమ (FAQ)",
      ta: "கோதுமை (FAQ)",
      pa: "ਕਣਕ (FAQ)",
      mr: "गहू (FAQ)",
      kn: "ಗೋಧಿ (FAQ)",
      bn: "গম (FAQ)",
      gu: "ઘઉં (FAQ)"
    },
    maize: {
      en: "Maize (Hybrid)",
      hi: "मक्का (Maize Hybrid)",
      te: "మొక్కజొన్న (హైబ్రిడ్)",
      ta: "மக்காச்சோளம் (ஹைப்ரிட்)",
      pa: "ਮੱਕੀ (ਹਾਈਬ੍ਰਿਡ)",
      mr: "मका (हायब्रिड)",
      kn: "ಜೋಳ (ಹೈಬ್ರಿಡ್)",
      bn: "ভুট্টা (হাইব্রিড)",
      gu: "મકાઈ (હાઇબ્રિડ)"
    },
    chana: {
      en: "Chana (Gram / Chickpea)",
      hi: "चना (Gram / Chickpea)",
      te: "శనగలు (దేశీ)",
      ta: "கொண்டைக்கடலை (தேசி)",
      pa: "ਛੋਲੇ (ਦੇਸੀ ਚਣਾ)",
      mr: "हरभरा (चना)",
      kn: "ಕಡಲೆ (ದೇಶಿ)",
      bn: "ছোলা (দেশি)",
      gu: "ચણા (દેશી ચણા)"
    },
    mustard: {
      en: "Mustard (Sarson)",
      hi: "सरसों (Mustard)",
      te: "ఆవాలు",
      ta: "கடுகு",
      pa: "ਸਰ੍ਹੋਂ",
      mr: "मोहरी (Mustard)",
      kn: "ಸಾಸಿವೆ",
      bn: "সরিষা",
      gu: "રાયડો (સરસવ)"
    }
  };

  function getCropName(cropRef, lang = "hi") {
    if (!cropRef) return (CROP_TRANSLATIONS.paddy_a[lang] || CROP_TRANSLATIONS.paddy_a.en);
    const s = String(cropRef).toLowerCase();

    let key = "paddy_a";
    if (s.includes("paddy") || s.includes("धान") || s.includes("వరి") || s.includes("நெல்") || s.includes("ਝੋਨਾ") || s.includes("भात") || s.includes("ಭತ್ತ") || s.includes("ડાંગર")) {
      key = "paddy_a";
    } else if (s.includes("wheat") || s.includes("गेहूँ") || s.includes("గోధుమ") || s.includes("கோதுமை") || s.includes("ਕਣਕ") || s.includes("गहू") || s.includes("ಗೋಧಿ") || s.includes("গম") || s.includes("ઘઉં")) {
      key = "wheat";
    } else if (s.includes("maize") || s.includes("मक्का") || s.includes("మొక్కజొన్న") || s.includes("மக்காச்சோளம்") || s.includes("ਮੱਕੀ") || s.includes("मका") || s.includes("ಜೋಳ") || s.includes("ভুট্টা") || s.includes("મકાઈ")) {
      key = "maize";
    } else if (s.includes("chana") || s.includes("gram") || s.includes("चना") || s.includes("శనగలు") || s.includes("கொண்டைக்கடலை") || s.includes("ਛੋਲੇ") || s.includes("हरभरा") || s.includes("ಕಡಲೆ") || s.includes("ছোলা") || s.includes("ચણા")) {
      key = "chana";
    } else if (s.includes("mustard") || s.includes("sarson") || s.includes("सरसों") || s.includes("ఆవాలు") || s.includes("கடுகு") || s.includes("ਸਰ੍ਹੋਂ") || s.includes("मोहरी") || s.includes("ಸಾಸಿವೆ") || s.includes("সরিষা") || s.includes("રાયડો")) {
      key = "mustard";
    }

    const dict = CROP_TRANSLATIONS[key] || CROP_TRANSLATIONS.paddy_a;
    return dict[lang] || dict.en || key;
  }

  // Pre-configured Verified Procurement Centres across Key Agricultural Hubs
  const PROCUREMENT_CENTRES = [
    {
      id: "PC-101",
      name: "Karnal Central Procurement Hub",
      district: "Karnal, Haryana",
      lat: 29.6857,
      lng: 76.9905,
      counters: 6,
      moistureLab: "Active (2 Digital Lab Meters)",
      weighbridges: "2 Electronic Lanes",
      activeQueue: "4 Trolleys (~12 min wait)",
      dailyCapacity: "2,500 Qtl",
      openHours: "08:00 AM - 07:00 PM"
    },
    {
      id: "PC-102",
      name: "Gharaunda Agri Mandi Centre",
      district: "Gharaunda, Karnal",
      lat: 29.5412,
      lng: 76.9734,
      counters: 4,
      moistureLab: "Active (1 Digital Meter)",
      weighbridges: "1 Electronic Lane",
      activeQueue: "8 Trolleys (~22 min wait)",
      dailyCapacity: "1,800 Qtl",
      openHours: "08:30 AM - 06:30 PM"
    },
    {
      id: "PC-103",
      name: "Taraori Grain Market Hub",
      district: "Taraori, Karnal",
      lat: 29.8055,
      lng: 76.9298,
      counters: 4,
      moistureLab: "Active (2 Digital Meters)",
      weighbridges: "2 Electronic Lanes",
      activeQueue: "2 Trolleys (~6 min wait)",
      dailyCapacity: "2,000 Qtl",
      openHours: "08:00 AM - 06:00 PM"
    },
    {
      id: "PC-104",
      name: "Kurukshetra District Procurement Mandi",
      district: "Kurukshetra, Haryana",
      lat: 29.9695,
      lng: 76.8783,
      counters: 8,
      moistureLab: "Active (3 Lab Counters)",
      weighbridges: "3 Electronic Lanes",
      activeQueue: "11 Trolleys (~30 min wait)",
      dailyCapacity: "3,500 Qtl",
      openHours: "07:30 AM - 07:30 PM"
    },
    {
      id: "PC-105",
      name: "Panipat Agro Commodity Terminal",
      district: "Panipat, Haryana",
      lat: 29.3909,
      lng: 76.9635,
      counters: 5,
      moistureLab: "Active (2 Lab Counters)",
      weighbridges: "2 Electronic Lanes",
      activeQueue: "6 Trolleys (~18 min wait)",
      dailyCapacity: "2,200 Qtl",
      openHours: "08:00 AM - 06:00 PM"
    },
    {
      id: "PC-106",
      name: "Warangal Central Agri Procurement Yard",
      district: "Warangal, Telangana",
      lat: 17.9784,
      lng: 79.5941,
      counters: 6,
      moistureLab: "Active (2 Digital Meters)",
      weighbridges: "2 Electronic Lanes",
      activeQueue: "5 Trolleys (~15 min wait)",
      dailyCapacity: "2,800 Qtl",
      openHours: "08:00 AM - 06:30 PM"
    }
  ];

  // Default Initial Demo Farmers
  const DEMO_FARMERS = {
    ramesh: {
      name: "Ramesh Chand",
      id: "FAR-2026-8812",
      phone: "9876543212",
      village: "Nilokheri (Karnal)",
      land: "4.5 Acres",
      aadhaar: "XXXX-XXXX-5019",
      bank: "SBI A/c ...5019",
      crop: "paddy_a",
      lat: 29.6857,
      lng: 76.9905
    },
    sukhwinder: {
      name: "Sukhwinder Singh",
      id: "FAR-2026-9044",
      phone: "9876543210",
      village: "Gharaunda (Karnal)",
      land: "8.0 Acres",
      aadhaar: "XXXX-XXXX-9102",
      bank: "PNB A/c ...9102",
      crop: "wheat",
      lat: 29.5412,
      lng: 76.9734
    },
    venkat: {
      name: "Venkata Rao",
      id: "FAR-2026-7731",
      phone: "9876543211",
      village: "Warangal (Telangana)",
      land: "6.2 Acres",
      aadhaar: "XXXX-XXXX-4412",
      bank: "SBI A/c ...4412",
      crop: "maize",
      lat: 17.9784,
      lng: 79.5941
    }
  };

  let prompts = {};
  let voiceEnabled = true;
  let currentAudio = null;
  let userCoords = { lat: 29.6857, lng: 76.9905 }; // Default to Karnal region

  // Complete UI Localization Dictionary for all 9 Languages
  const UI_TEXT = {
    en: {
      portalTitle: "AgriQueue",
      portalSubtitle: "Crop Procurement & Mandi Queue Management Platform (SIH26032)",
      hindiSub: "Smart Farmer Procurement Portal",
      govMsp: "Government MSP 2026",
      paddyTicker: "🌾 Paddy (Grade A): ₹2,300 / Qtl",
      wheatTicker: "🌾 Wheat (FAQ): ₹2,275 / Qtl",
      maizeTicker: "🌽 Maize (Hybrid): ₹2,090 / Qtl",
      chanaTicker: "🌱 Gram (Chana): ₹5,440 / Qtl",
      mustardTicker: "🌻 Mustard (Sarson): ₹5,650 / Qtl",
      farmerName: "Ramesh Chand",
      farmerCode: "Farmer Code",
      land: "Land",
      landVal: "4.5 Acres",
      village: "Village: Nilokheri (Karnal)",
      verifiedBadge: "✓ Aadhaar & Meri Fasal Verified",
      dbtBadge: "SBI Direct DBT Active (A/c ...5019)",
      tab1: "Procurement Slot & Token",
      tab2: "📍 Nearest Mandis",
      tab3: "Live Queue & ETA Tracker",
      tab4: "J-Forms & MSP DBT Records",
      bookingTitle: "Procurement Slot & Digital Token Booking",
      bookingSubtitle: "Book your procurement slot in advance to avoid waiting in mandi queues.",
      cropLabel: "Crop for Procurement (Crop Variety)",
      cropOptPaddy: "Paddy Grade A - ₹2,300 / Qtl",
      cropOptWheat: "Wheat FAQ - ₹2,275 / Qtl",
      cropOptMaize: "Maize Hybrid - ₹2,090 / Qtl",
      cropOptChana: "Chana (Gram) - ₹5,440 / Qtl",
      cropOptMustard: "Mustard (Sarson) - ₹5,650 / Qtl",
      qtyLabel: "Estimated Quantity (Quintals)",
      qtyPlaceholder: "e.g. 50",
      hubLabel: "Procurement Hub / Mandi",
      hubOpt1: "PC-101: Karnal Central Hub (Fastest)",
      hubOpt2: "PC-102: Gharaunda Agri Mandi Centre",
      hubOpt3: "PC-103: Taraori Grain Market Hub",
      slotLabel: "Arrival Time Slot",
      slotOpt1: "Today 09:00 AM - 10:00 AM (8 slots left)",
      slotOpt2: "Today 10:00 AM - 11:00 AM (14 slots left)",
      slotOpt3: "Today 11:00 AM - 12:00 PM (4 slots left)",
      slotOpt4: "Today 02:00 PM - 03:00 PM (18 slots left)",
      vehicleLabel: "Vehicle / Trolley Number",
      phoneLabel: "Farmer Mobile (Aadhaar Linked)",
      bookBtn: "BOOK SLOT & GENERATE DIGITAL TOKEN",
      calcTitle: "Expected Government MSP Payout",
      calcSubtitle: "Direct Bank Transfer (DBT) calculated as per FCI standards.",
      mspRateLabel: "Active Government MSP Rate:",
      moistureNormLabel: "Accepted Moisture Norm (Max):",
      moistureNormVal: "≤ 14.0% (Grade A Standard)",
      foreignMatterLabel: "Foreign Matter Limit:",
      foreignMatterVal: "≤ 1.0% Permitted",
      totalPayoutLabel: "Total Expected DBT Payout:",
      instructionTitle: "Procurement Guidelines:",
      instruction1: "1. Arrive at centre gate during your allotted time slot.",
      instruction2: "2. Complete digital lab moisture testing at Counter 2.",
      instruction3: "3. Electronic weighbridge gross/tare weighment for digital J-Form.",
      ticketCardTitle: "Your Digital Queue Token",
      ticketCardSubtitle: "Smart AI M/M/c algorithm live queue dispatch.",
      ticketHeader: "🏛️ Karnal Central Procurement Hub • Lane 2",
      assignedLane: "Assigned Counter: Counter 2 (Moisture Lab Ready)",
      currServing: "Currently Serving",
      estTime: "Estimated Wait",
      aheadCount: "Farmers Ahead",
      aheadVal: "3 Farmers",
      step1: "Slot Booked",
      step2: "Gate Entry",
      step3: "Moisture Test",
      step4: "Weighbridge",
      step5: "DBT Payment",
      voiceNotice: "📢 When your token is called, loudspeaker audio announcement and SMS will be sent.",
      qualityTitle: "Live Quality & Weighbridge Telemetry",
      qualitySubtitle: "Lab moisture meter & electronic weighbridge real-time data.",
      moistureTestLabel: "Digital Moisture Meter:",
      gradePassBadge: "11.8% (Grade-A Passed)",
      moistureDesc: "Moisture is below 14.0% threshold. 100% full MSP rate applied. Zero deduction.",
      weighmentLabel: "Electronic Weighbridge:",
      weighmentDesc: "Gross: 58.20 Qtl • Tare: 8.20 Qtl = Net: 50.00 Qtl",
      dbtAmountLabel: "DBT Disbursement Amount:",
      dbtTransferDesc: "Directly credited via PFMS to State Bank of India account (...5019).",
      recordsTitle: "Government J-Forms & MSP Receipts",
      recordsSubtitle: "Certified procurement receipts and direct bank transaction records.",
      voiceOn: "Voice: ON",
      voiceOff: "Voice: OFF",
      // Geolocation & Mandi Finder
      gpsBannerTitle: "GPS Farm Location & Nearest Procurement Centres",
      gpsBannerSubtitle: "Find closest FCI & State mandi hubs sorted by real-time driving distance.",
      btnGpsDetect: "Detect My Farm Location",
      nearestMandiTitle: "Nearest Procurement Centres to Your Field",
      nearestMandiSub: "Select a centre to auto-fill the procurement slot booking form.",
      selectMandiBtn: "Select This Hub & Book Slot",
      nearestBadgeText: "Closest Centre (Fastest)",
      // Auth Flow
      loginTitle: "Farmer Sign In",
      loginSubtitle: "Sign in to book mandi slots, track live tokens, and receive direct MSP DBT payments.",
      loginUserLabel: "Mobile Number or Farmer ID",
      loginPinLabel: "4-Digit Security PIN / Password",
      loginBtn: "SIGN IN TO PORTAL",
      demoTitle: "⚡ 1-Click Demo Farmer Logins for Evaluation",
      noAccountText: "Don't have an account?",
      registerLinkText: "Register New Farmer KYC",
      signupTitle: "Farmer KYC Registration",
      signupSubtitle: "Register for Government MSP procurement, weighbridge tokens, and direct bank transfers.",
      signupNameLabel: "Farmer Full Name",
      signupMobileLabel: "Mobile Number (Aadhaar Linked)",
      signupAadhaarLabel: "12-Digit Aadhaar Number",
      signupLandLabel: "Total Land Size (Acres)",
      signupVillageLabel: "Village & District",
      gpsFieldLabel: "Farm GPS Coordinates",
      bankAccLabel: "Bank Account No. for DBT",
      ifscLabel: "Bank IFSC Code",
      createPinLabel: "Create 4-Digit Security PIN",
      govVerificationNote: "Automatic verification with Meri Fasal Mera Byora & PM-Kisan registry.",
      completeSignupBtn: "COMPLETE REGISTRATION",
      alreadyAccountText: "Already registered?",
      loginLinkText: "Sign In Here",
      logoutText: "Logout"
    },
    hi: {
      portalTitle: "AgriQueue (एग्रीकतार)",
      portalSubtitle: "स्मार्ट किसान खरीद व मंडी कतार प्रबंधन पोर्टल (SIH26032)",
      hindiSub: "स्मार्ट किसान खरीद व कतार पोर्टल",
      govMsp: "सरकारी समर्थन मूल्य (MSP 2026)",
      paddyTicker: "🌾 धान (ग्रेड-ए): ₹2,300 / क्विंटल",
      wheatTicker: "🌾 गेहूँ (FAQ): ₹2,275 / क्विंटल",
      maizeTicker: "🌽 मक्का (हाइब्रिड): ₹2,090 / क्विंटल",
      chanaTicker: "🌱 चना: ₹5,440 / क्विंटल",
      mustardTicker: "🌻 सरसों: ₹5,650 / क्विंटल",
      farmerName: "रमेश चंद",
      farmerCode: "किसान कोड",
      land: "जमीन",
      landVal: "4.5 एकड़",
      village: "गाँव: निलोखेड़ी (करनाल)",
      verifiedBadge: "✓ मेरी फसल मेरा ब्यौरा सत्यापित",
      dbtBadge: "SBI डायरेक्ट DBT सक्रिय (खाता ...5019)",
      tab1: "खरीद स्लॉट व टोकन",
      tab2: "📍 निकटतम खरीद केंद्र",
      tab3: "लाइव कतार ट्रैकर (ETA)",
      tab4: "खरीद रसीद व MSP भुगतान",
      bookingTitle: "खरीद स्लॉट व डिजिटल टोकन बुकिंग",
      bookingSubtitle: "मंडी में बिना कतार इंतजार किए अपना डिजिटल स्लॉट चुनें।",
      cropLabel: "खरीद हेतु फसल (Crop Variety)",
      cropOptPaddy: "धान ग्रेड-ए (Paddy Grade A) - ₹2,300/q",
      cropOptWheat: "गेहूँ (Wheat FAQ) - ₹2,275/q",
      cropOptMaize: "मक्का (Maize Hybrid) - ₹2,090/q",
      cropOptChana: "चना (Gram) - ₹5,440/q",
      cropOptMustard: "सरसों (Mustard) - ₹5,650/q",
      qtyLabel: "अनुमानित मात्रा (क्विंटल)",
      qtyPlaceholder: "उदा. 50",
      hubLabel: "खरीद केंद्र / मंडी (Procurement Hub)",
      hubOpt1: "PC-101: करनाल केंद्रीय खरीद केंद्र (सबसे तेज)",
      hubOpt2: "PC-102: घरौंडा अनाज मंडी केंद्र",
      hubOpt3: "PC-103: तरावड़ी ग्रेन मार्केट हब",
      slotLabel: "आगमन समय स्लॉट (Arrival Slot)",
      slotOpt1: "आज 09:00 AM - 10:00 AM (8 स्लॉट शेष)",
      slotOpt2: "आज 10:00 AM - 11:00 AM (14 स्लॉट शेष)",
      slotOpt3: "आज 11:00 AM - 12:00 PM (4 स्लॉट शेष)",
      slotOpt4: "आज 02:00 PM - 03:00 PM (18 स्लॉट शेष)",
      vehicleLabel: "वाहन / ट्रॉली नंबर",
      phoneLabel: "किसान मोबाइल नंबर (आधार लिंक)",
      bookBtn: "स्लॉट बुक करें व टोकन बनाएं (BOOK SLOT)",
      calcTitle: "अपेक्षित MSP सरकारी भुगतान",
      calcSubtitle: "नमी परीक्षण व वजन के अनुसार प्रत्यक्ष बैंक ट्रांसफर (DBT)।",
      mspRateLabel: "लागू सरकारी MSP दर:",
      moistureNormLabel: "स्वीकार्य नमी मानक (Max Moisture):",
      moistureNormVal: "≤ 14.0% (ग्रेड ए मानक)",
      foreignMatterLabel: "विदेशी तत्व (Foreign Matter):",
      foreignMatterVal: "≤ 1.0% अनुमत",
      totalPayoutLabel: "कुल अनुमानित भुगतान (DBT):",
      instructionTitle: "खरीद प्रक्रिया निर्देश:",
      instruction1: "1. टोकन समय पर खरीद केंद्र के गेट पर पहुंचें।",
      instruction2: "2. लैब में डिजिटल नमी जांच (Moisture meter test) करवाएं।",
      instruction3: "3. इलेक्ट्रॉनिक धर्मकांटे पर वजन कराकर डिजिटल रसीद प्राप्त करें।",
      ticketCardTitle: "आपका डिजिटल कतार टोकन",
      ticketCardSubtitle: "स्मार्ट AI M/M/c एल्गोरिदम द्वारा लाइव कतार स्थिति।",
      ticketHeader: "🏛️ करनाल केंद्रीय खरीद केंद्र • लेन 2",
      assignedLane: "आवंटित काउंटर: काउंटर 2 (Moisture Lab Ready)",
      currServing: "वर्तमान सेवारत",
      estTime: "अनुमानित समय",
      aheadCount: "आगे किसान",
      aheadVal: "3 किसान",
      step1: "स्लॉट बुक",
      step2: "गेट एंट्री",
      step3: "नमी परीक्षण",
      step4: "धर्मकांटा वजन",
      step5: "बैंक भुगतान",
      voiceNotice: "📢 जब आपका टोकन काउंटर पर बुलाया जाएगा, लाउडस्पीकर व एसएमएस द्वारा आवाज में सूचना मिलेगी।",
      qualityTitle: "लाइव गुणवत्ता व धर्मकांटा स्थिति",
      qualitySubtitle: "लैब नमी व इलेक्ट्रॉनिक वेईब्रिज लाइव डेटा।",
      moistureTestLabel: "डिजिटल नमी मीटर (Moisture Test):",
      gradePassBadge: "11.8% (ग्रेड-ए पास)",
      moistureDesc: "नमी की मात्रा 14.0% से कम है। 100% पूर्ण MSP दर (₹2,300/q) लागू। शून्य कटौती।",
      weighmentLabel: "इलेक्ट्रॉनिक वेईब्रिज (Weighment):",
      weighmentDesc: "सकल वजन: 58.20 Qtl • खाली ट्रॉली: 8.20 Qtl = शुद्ध: 50.00 Qtl",
      dbtAmountLabel: "डीबीटी भुगतान राशि:",
      dbtTransferDesc: "पीएफएमएस (PFMS) द्वारा भारतीय स्टेट बैंक खाते (...5019) में अंतरित किया जा रहा है।",
      recordsTitle: "सरकारी खरीद जे-फॉर्म व भुगतान रसीदें",
      recordsSubtitle: "खरीद केंद्र द्वारा प्रमाणित रसीदें व बैंक लेनदेन विवरण।",
      voiceOn: "आवाज: चालू",
      voiceOff: "आवाज: बंद",
      // Geolocation & Mandi Finder
      gpsBannerTitle: "खेत की लोकेशन व निकटतम सरकारी खरीद केंद्र",
      gpsBannerSubtitle: "अपने खेत की लाइव जीपीएस दूरी के अनुसार निकटतम अनाज मंडियां खोजें।",
      btnGpsDetect: "खेत की लोकेशन खोजें (GPS Detect)",
      nearestMandiTitle: "आपके निकटतम खरीद केंद्र एवं मंडियां",
      nearestMandiSub: "स्लॉट बुक करने के लिए किसी भी केंद्र का चयन करें।",
      selectMandiBtn: "यह केंद्र चुनें व स्लॉट बुक करें",
      nearestBadgeText: "निकटतम केंद्र (सबसे तेज)",
      // Auth Flow
      loginTitle: "किसान लॉगिन (Farmer Sign In)",
      loginSubtitle: "फसल खरीद स्लॉट, मंडी कतार और सीधे बैंक भुगतान (DBT) के लिए प्रवेश करें।",
      loginUserLabel: "मोबाइल नंबर या किसान आईडी",
      loginPinLabel: "4-अंकों का सुरक्षा पिन / पासवर्ड",
      loginBtn: "लॉगिन करें (SIGN IN)",
      demoTitle: "⚡ तुरंत परीक्षण हेतु डेमो किसान प्रोफाइल (1-Click Demo Logins)",
      noAccountText: "खाता नहीं है?",
      registerLinkText: "नया किसान पंजीकरण करें (Register New Farmer)",
      signupTitle: "नया किसान पंजीकरण (Farmer Registration)",
      signupSubtitle: "सरकारी MSP खरीद, इलेक्ट्रॉनिक धर्मकांटा टोकन व सीधे बैंक खाते (DBT) हेतु पंजीकरण करें।",
      signupNameLabel: "किसान का पूरा नाम",
      signupMobileLabel: "मोबाइल नंबर (आधार लिंक)",
      signupAadhaarLabel: "12-अंकों का आधार नंबर",
      signupLandLabel: "कुल कृषि भूमि (एकड़)",
      signupVillageLabel: "गाँव व जिला",
      gpsFieldLabel: "खेत की लाइव GPS लोकेशन",
      bankAccLabel: "बैंक खाता संख्या (DBT हेतु)",
      ifscLabel: "बैंक IFSC कोड",
      createPinLabel: "4-अंकों का नया लॉगिन पिन बनाएं",
      govVerificationNote: "पंजीकरण के उपरांत मेरी फसल मेरा ब्यौरा व पीएम-किसान डेटाबेस से त्वरित सत्यापन किया जाएगा।",
      completeSignupBtn: "पंजीकरण पूरा करें (COMPLETE SIGNUP)",
      alreadyAccountText: "पहले से पंजीकृत हैं?",
      loginLinkText: "किसान लॉगिन करें",
      logoutText: "लॉगआउट"
    },
    te: {
      portalTitle: "AgriQueue (అగ్రి క్యూ)",
      portalSubtitle: "స్మార్ట్ రైతు పంట సేకరణ & క్యూ నిర్వహణ పోర్టల్ (SIH26032)",
      hindiSub: "రైతు సేకరణ పోర్టల్",
      govMsp: "ప్రభుత్వ మద్దతు ధర (MSP 2026)",
      paddyTicker: "🌾 వరి (గ్రేడ్-ఎ): ₹2,300 / క్వింటాల్",
      wheatTicker: "🌾 గోధుమ (FAQ): ₹2,275 / క్వింటాల్",
      maizeTicker: "🌽 మొక్కజొన్న: ₹2,090 / క్వింటాల్",
      chanaTicker: "🌱 శనగలు: ₹5,440 / క్వింటాల్",
      mustardTicker: "🌻 ఆవాలు: ₹5,650 / క్వింటాల్",
      farmerName: "రమేష్ చంద్",
      farmerCode: "రైతు కోడ్",
      land: "భూమి",
      landVal: "4.5 ఎకరాలు",
      village: "గ్రామం: నీలోఖేరి (కర్నాల్)",
      verifiedBadge: "✓ ఆధార్ ధృవీకరించబడింది",
      dbtBadge: "SBI డైరెక్ట్ DBT యాక్టివ్ (A/c ...5019)",
      tab1: "సేకరణ స్లాట్ & టోకెన్",
      tab2: "📍 సమీప సేకరణ కేంద్రాలు",
      tab3: "లైవ్ క్యూ & వేచి ఉండే సమయం",
      tab4: "జే-ఫారమ్‌లు & MSP చెల్లింపు",
      bookingTitle: "సేకరణ స్లాట్ & డిజిటల్ టోకెన్ బుకింగ్",
      bookingSubtitle: "మార్కెట్ క్యూలో నిరీక్షణ లేకుండా మీ స్లాట్ బుక్ చేసుకోండి.",
      cropLabel: "సేకరణ కొరకు పంట (పంట రకం)",
      cropOptPaddy: "వరి గ్రేడ్-ఎ - ₹2,300 / క్వింటాల్",
      cropOptWheat: "గోధుమ FAQ - ₹2,275 / క్వింటాల్",
      cropOptMaize: "మొక్కజొన్న - ₹2,090 / క్వింటాల్",
      cropOptChana: "శనగలు - ₹5,440 / క్వింటాల్",
      cropOptMustard: "ఆవాలు - ₹5,650 / క్వింటాల్",
      qtyLabel: "అంచనా బరువు (క్వింటాళ్ళు)",
      qtyPlaceholder: "ఉదా. 50",
      hubLabel: "సేకరణ కేంద్రం / మండి",
      hubOpt1: "PC-101: కర్నాల్ సెంట్రల్ హబ్ (వేగవంతమైనది)",
      hubOpt2: "PC-102: ఘరౌండా మార్కెట్ యార్డ్",
      hubOpt3: "PC-103: తరావడి ధాన్య మార్కెట్",
      slotLabel: "రాక సమయం స్లాట్",
      slotOpt1: "ఈరోజు 09:00 AM - 10:00 AM (8 స్లాట్లు ఖాళీ)",
      slotOpt2: "ఈరోజు 10:00 AM - 11:00 AM (14 స్లాట్లు ఖాళీ)",
      slotOpt3: "ఈరోజు 11:00 AM - 12:00 PM (4 స్లాట్లు ఖాళీ)",
      slotOpt4: "ఈరోజు 02:00 PM - 03:00 PM (18 స్లాట్లు ఖాళీ)",
      vehicleLabel: "వాహనం / ట్రాలీ నంబర్",
      phoneLabel: "రైతు మొబైల్ (ఆధార్ లింక్)",
      bookBtn: "స్లాట్ బుక్ చేయండి & టోకెన్ పొందండి",
      calcTitle: "అంచనా వేసిన ప్రభుత్వ MSP చెల్లింపు",
      calcSubtitle: "FCI నిబంధనల ప్రకారం నేరుగా బ్యాంక్ బదిలీ (DBT).",
      mspRateLabel: "ప్రభుత్వ MSP ధర:",
      moistureNormLabel: "తేమ పరిమితి (Max Moisture):",
      moistureNormVal: "≤ 14.0% (గ్రేడ్ ఎ ప్రమాణం)",
      foreignMatterLabel: "చెత్త పరిమితి:",
      foreignMatterVal: "≤ 1.0% అనుమతించబడుతుంది",
      totalPayoutLabel: "మొత్తం DBT చెల్లింపు:",
      instructionTitle: "సేకరణ మార్గదర్శకాలు:",
      instruction1: "1. బుక్ చేసుకున్న సమయానికి కేంద్రం గేట్ వద్దకు చేరుకోండి.",
      instruction2: "2. కౌంటర్ 2 వద్ద డిజిటల్ తేమ పరీక్ష పూర్తి చేసుకోండి.",
      instruction3: "3. ఎలక్ట్రానిక్ వేబ్రిడ్జ్ వద్ద తూకం వేయించి డిజిటల్ రసీదు పొందండి.",
      ticketCardTitle: "మీ డిజిటల్ క్యూ టోకెన్",
      ticketCardSubtitle: "స్మార్ట్ AI అల్గోరిథం లైవ్ క్యూ స్థితి.",
      ticketHeader: "🏛️ కర్నాల్ సెంట్రల్ సేకరణ కేంద్రం • లేన్ 2",
      assignedLane: "కేటాయించిన కౌంటర్: కౌంటర్ 2 (Moisture Lab)",
      currServing: "ప్రస్తుత టోకెన్",
      estTime: "వేచి ఉండే సమయం",
      aheadCount: "ముందున్న రైతులు",
      aheadVal: "3 రైతులు",
      step1: "స్లాట్ బుక్",
      step2: "గేట్ ఎంట్రీ",
      step3: "తేమ పరీక్ష",
      step4: "తూకం వేయడం",
      step5: "బ్యాంక్ బదిలీ",
      voiceNotice: "📢 మీ టోకెన్ పిలిచినప్పుడు మైక్ మరియు SMS ద్వారా వాయిస్ ప్రకటన వస్తుంది.",
      qualityTitle: "నాణ్యత & తూకం వివరాలు",
      qualitySubtitle: "డిజిటల్ తేమ మీటర్ & ఎలక్ట్రానిక్ వేబ్రిడ్జ్ డేటా.",
      moistureTestLabel: "డిజిటల్ తేమ పరీక్ష:",
      gradePassBadge: "11.8% (గ్రేడ్-ఎ పాస్)",
      moistureDesc: "తేమ 14% కంటే తక్కువగా ఉంది. 100% పూర్తి MSP రేటు లభిస్తుంది.",
      weighmentLabel: "ఎలక్ట్రానిక్ వేబ్రిడ్జ్:",
      weighmentDesc: "స్థూల బరువు: 58.20 Qtl • ఖాళీ ట్రాలీ: 8.20 Qtl = నికర: 50.00 Qtl",
      dbtAmountLabel: "DBT చెల్లింపు మొత్తం:",
      dbtTransferDesc: "PFMS ద్వారా స్టేట్ బ్యాంక్ ఆఫ్ ఇండియా ఖాతా (...5019) లో జమ చేయబడుతుంది.",
      recordsTitle: "జే-ఫారమ్‌లు & ప్రభుత్వ రసీదులు",
      recordsSubtitle: "ధృవీకరించబడిన సేకరణ రసీదులు మరియు బ్యాంక్ లావాదేవీ రికార్డులు.",
      voiceOn: "వాయిస్: ఆన్",
      voiceOff: "వాయిస్: ఆఫ్",
      // Geolocation
      gpsBannerTitle: "పొలం స్థానం & సమీప సేకరణ కేంద్రాలు",
      gpsBannerSubtitle: "లైవ్ జీపీఎస్ దూరం ప్రకారం సమీప మార్కెట్ యార్డులను కనుగొనండి.",
      btnGpsDetect: "లొకేషన్ గుర్తించండి (GPS Detect)",
      nearestMandiTitle: "మీ సమీపంలోని సేకరణ కేంద్రాలు",
      nearestMandiSub: "స్లాట్ బుక్ చేసుకోవడానికి కేంద్రాన్ని ఎంచుకోండి.",
      selectMandiBtn: "ఈ కేంద్రాన్ని ఎంచుకోండి",
      nearestBadgeText: "సమీప కేంద్రం (వేగవంతమైనది)",
      // Auth
      loginTitle: "రైతు లాగిన్ (Farmer Sign In)",
      loginSubtitle: "స్లాట్ బుకింగ్ మరియు DBT చెల్లింపుల కోసం లాగిన్ అవ్వండి.",
      loginUserLabel: "మొబైల్ నంబర్ లేదా రైతు ID",
      loginPinLabel: "4-అంకెల సెక్యూరిటీ పిన్",
      loginBtn: "లాగిన్ చేయండి (SIGN IN)",
      demoTitle: "⚡ డెమో ప్రొఫైల్స్ (1-Click Demo Logins)",
      noAccountText: "ఖాతా లేదా?",
      registerLinkText: "కొత్త రైతు నమోదు చేసుకోండి",
      signupTitle: "కొత్త రైతు నమోదు (Registration)",
      signupSubtitle: "ప్రభుత్వ MSP సేకరణ కోసం నమోదు చేసుకోండి.",
      signupNameLabel: "రైతు పూర్తి పేరు",
      signupMobileLabel: "మొబైల్ నంబర్",
      signupAadhaarLabel: "ఆధార్ నంబర్",
      signupLandLabel: "భూమి విస్తీర్ణం (ఎకరాలు)",
      signupVillageLabel: "గ్రామం & జిల్లా",
      gpsFieldLabel: "GPS లొకేషన్",
      bankAccLabel: "బ్యాంక్ ఖాతా సంఖ్య",
      ifscLabel: "IFSC కోడ్",
      createPinLabel: "కొత్త పిన్ సృష్టించండి",
      govVerificationNote: "ప్రభుత్వ డేటాబేస్ నుండి స్వయంచాలక ధృవీకరణ.",
      completeSignupBtn: "నమోదు పూర్తి చేయండి",
      alreadyAccountText: "ఇప్పటికే ఖాతా ఉందా?",
      loginLinkText: "ఇక్కడ లాగిన్ అవ్వండి",
      logoutText: "లాగ్ అవుట్"
    },
    ta: {
      portalTitle: "AgriQueue (அக்ரி கியூ)",
      portalSubtitle: "விவசாயிகள் கொள்முதல் & வரிசை மேலாண்மை தளம் (SIH26032)",
      hindiSub: "விவசாயிகள் கொள்முதல் தளம்",
      govMsp: "அரசு குறைந்தபட்ச ஆதரவு விலை (MSP 2026)",
      paddyTicker: "🌾 நெல் (கிரேடு-ஏ): ₹2,300 / குவிண்டால்",
      wheatTicker: "🌾 கோதுமை (FAQ): ₹2,275 / குவிண்டால்",
      maizeTicker: "🌽 மக்காச்சோளம்: ₹2,090 / குவிண்டால்",
      chanaTicker: "🌱 கொண்டைக்கடலை: ₹5,440 / குவிண்டால்",
      mustardTicker: "🌻 கடுகு: ₹5,650 / குவிண்டால்",
      farmerName: "ரமேஷ் சந்த்",
      farmerCode: "விவசாயி குறியீடு",
      land: "நிலம்",
      landVal: "4.5 ஏக்கர்",
      village: "கிராமம்: நிலோகேரி (கர்னல்)",
      verifiedBadge: "✓ ஆதார் சரிபார்க்கப்பட்டது",
      dbtBadge: "எஸ்பிஐ டிபிடி செயலில் உள்ளது",
      tab1: "கொள்முதல் முன்பதிவு & டோக்கன்",
      tab2: "📍 அருகிலுள்ள கொள்முதல் மையங்கள்",
      tab3: "நேரலை வரிசை & காத்திருப்பு நேரம்",
      tab4: "கொள்முதல் ரசீது & வங்கி பணம்",
      bookingTitle: "கொள்முதல் ஸ்லாட் & டோக்கன் முன்பதிவு",
      bookingSubtitle: "நேரத்தை மிச்சப்படுத்த டிஜிட்டல் டோக்கனை முன்பதிவு செய்யவும்.",
      cropLabel: "கொள்முதல் பயிர் வகை",
      cropOptPaddy: "நெல் கிரேடு-ஏ - ₹2,300 / குவிண்டால்",
      cropOptWheat: "கோதுமை FAQ - ₹2,275 / குவிண்டால்",
      cropOptMaize: "மக்காச்சோளம் - ₹2,090 / குவிண்டால்",
      cropOptChana: "கொண்டைக்கடலை - ₹5,440 / குவிண்டால்",
      cropOptMustard: "கடுகு - ₹5,650 / குவிண்டால்",
      qtyLabel: "மதிப்பிடப்பட்ட எடை (குவிண்டால்)",
      qtyPlaceholder: "எ.கா. 50",
      hubLabel: "கொள்முதல் மையம் / மண்டி",
      hubOpt1: "PC-101: கர்னல் மத்திய மையம் (வேகமானது)",
      hubOpt2: "PC-102: கரோண்டா மண்டி மையம்",
      hubOpt3: "PC-103: தராவரி தானிய சந்தை",
      slotLabel: "வருகை நேரம் ஸ்லாட்",
      slotOpt1: "இன்று 09:00 AM - 10:00 AM (8 மீதமுள்ளது)",
      slotOpt2: "இன்று 10:00 AM - 11:00 AM (14 மீதமுள்ளது)",
      slotOpt3: "இன்று 11:00 AM - 12:00 PM (4 மீதமுள்ளது)",
      slotOpt4: "இன்று 02:00 PM - 03:00 PM (18 மீதமுள்ளது)",
      vehicleLabel: "வாகன / டிராக்டர் எண்",
      phoneLabel: "விவசாயி மொபைல் எண்",
      bookBtn: "டோக்கனை முன்பதிவு செய்க",
      calcTitle: "எதிர்பார்க்கப்படும் அரசு MSP தொகை",
      calcSubtitle: "நேரடி வங்கி பரிமாற்றம் (DBT) மதிப்பீடு.",
      mspRateLabel: "அரசு MSP விலை:",
      moistureNormLabel: "ஈரப்பதம் வரம்பு:",
      moistureNormVal: "≤ 14.0% (கிரேடு ஏ)",
      foreignMatterLabel: "தூய்மை வரம்பு:",
      foreignMatterVal: "≤ 1.0% அனுமதி",
      totalPayoutLabel: "மொத்த வங்கி தொகை (DBT):",
      instructionTitle: "கொள்முதல் வழிகாட்டுதல்கள்:",
      instruction1: "1. குறித்த நேரத்தில் மையத்தின் நுழைவாயிலை அடையவும்.",
      instruction2: "2. கவுண்டர் 2 இல் ஈரப்பத பரிசோதனையை முடிக்கவும்.",
      instruction3: "3. எடை மேடையில் எடையிட்டு டிஜிட்டல் ரசீதை பெறவும்.",
      ticketCardTitle: "உங்கள் டிஜிட்டல் வரிசை டோக்கன்",
      ticketCardSubtitle: "ஸ்மார்ட் AI நேரலை வரிசை கண்காணிப்பு.",
      ticketHeader: "🏛️ கர்னல் மத்திய கொள்முதல் மையம்",
      assignedLane: "ஒதுக்கப்பட்ட கவுண்டர்: கவுண்டர் 2",
      currServing: "தற்போதைய டோக்கன்",
      estTime: "காத்திருப்பு நேரம்",
      aheadCount: "முன்னால் உள்ளவர்கள்",
      aheadVal: "3 விவசாயிகள்",
      step1: "ஸ்லாட் பதிவு",
      step2: "நுழைவு",
      step3: "ஈரப்பதம் சோதனை",
      step4: "எடை மேடை",
      step5: "வங்கி பணம்",
      voiceNotice: "📢 உங்கள் டோக்கன் அழைக்கப்படும்போது ஒலிபெருக்கி மற்றும் SMS மூலம் குரல் அறிவிப்பு வரும்.",
      qualityTitle: "நேரலை தரம் & எடை விவரம்",
      qualitySubtitle: "டிஜிட்டல் ஈரப்பதமானி & மின்னணு எடை விவரங்கள்.",
      moistureTestLabel: "ஈரப்பத சோதனை:",
      gradePassBadge: "11.8% (கிரேடு-ஏ தேர்ச்சி)",
      moistureDesc: "ஈரப்பதம் 14% க்கும் குறைவாக உள்ளது. முழு MSP தொகை கிடைக்கும்.",
      weighmentLabel: "மின்னணு எடை மேடை:",
      weighmentDesc: "மொத்த எடை: 58.20 Qtl • நிகர எடை: 50.00 Qtl",
      dbtAmountLabel: "டிபிடி வங்கி தொகை:",
      dbtTransferDesc: "PFMS வழியாக பாரத ஸ்டேட் வங்கி கணக்கில் (...5019) செலுத்தப்படுகிறது.",
      recordsTitle: "அரசு கொள்முதல் ரசீதுகள்",
      recordsSubtitle: "சான்றளிக்கப்பட்ட கொள்முதல் ரசீதுகள் & வங்கி விவரங்கள்.",
      voiceOn: "குரல்: ஆன்",
      voiceOff: "குரல்: ஆஃப்",
      gpsBannerTitle: "பண்ணை இருப்பிடம் & அருகிலுள்ள கொள்முதல் மையங்கள்",
      gpsBannerSubtitle: "நேரலை ஜிபிஎஸ் தூரத்தின்படி அருகிலுள்ள மண்டிகளை கண்டறியவும்.",
      btnGpsDetect: "இருப்பிடத்தை கண்டறி (GPS Detect)",
      nearestMandiTitle: "அருகிலுள்ள கொள்முதல் மையங்கள்",
      nearestMandiSub: "முன்பதிவு செய்ய மையத்தை தேர்ந்தெடுக்கவும்.",
      selectMandiBtn: "இந்த மையத்தை தேர்வு செய்க",
      nearestBadgeText: "மிக அருகில் (வேகமானது)",
      loginTitle: "விவசாயி உள்நுழைவு (Farmer Login)",
      loginSubtitle: "மண்டி டோக்கன் மற்றும் வங்கி பரிமாற்றத்திற்கு உள்நுழையவும்.",
      loginUserLabel: "மொபைல் எண் அல்லது விவசாயி ஐடி",
      loginPinLabel: "பாதுகாப்பு பின் / கடவுச்சொல்",
      loginBtn: "உள்நுழைக (SIGN IN)",
      demoTitle: "⚡ மாதிரி விவசாயி சுயவிவரங்கள் (Demo Logins)",
      noAccountText: "கணக்கு இல்லையா?",
      registerLinkText: "புதிய விவசாயி பதிவு செய்க",
      signupTitle: "புதிய விவசாயி பதிவு (Registration)",
      signupSubtitle: "அரசு MSP கொள்முதலுக்கு பதிவு செய்யவும்.",
      signupNameLabel: "முழு பெயர்",
      signupMobileLabel: "மொபைல் எண்",
      signupAadhaarLabel: "ஆதார் எண்",
      signupLandLabel: "நில அளவு (ஏக்கர்)",
      signupVillageLabel: "கிராமம் & மாவட்டம்",
      gpsFieldLabel: "GPS இருப்பிடம்",
      bankAccLabel: "வங்கி கணக்கு எண்",
      ifscLabel: "IFSC குறியீடு",
      createPinLabel: "புதிய பின் உருவாக்கவும்",
      govVerificationNote: "அரசு தரவுத்தளத்துடன் தானியங்கி சரிபார்ப்பு.",
      completeSignupBtn: "பதிவை முடிக்கவும்",
      alreadyAccountText: "ஏற்கனவே பதிவு செய்தவரா?",
      loginLinkText: "இங்கே உள்நுழைக",
      logoutText: "வெளியேறு"
    },
    pa: {
      portalTitle: "AgriQueue (ਐਗਰੀ ਕਤਾਰ)",
      portalSubtitle: "ਸਮਾਰਟ ਕਿਸਾਨ ਖਰੀਦ ਅਤੇ ਕਤਾਰ ਪ੍ਰਬੰਧਨ ਪੋਰਟਲ (SIH26032)",
      hindiSub: "ਕਿਸਾਨ ਖਰੀਦ ਪੋਰਟਲ",
      govMsp: "ਸਰਕਾਰੀ ਸਮਰਥਨ ਮੁੱਲ (MSP 2026)",
      paddyTicker: "🌾 ਝੋਨਾ (ਗ੍ਰੇਡ-ਏ): ₹2,300 / ਕੁਇੰਟਲ",
      wheatTicker: "🌾 ਕਣਕ (FAQ): ₹2,275 / ਕੁਇੰਟਲ",
      maizeTicker: "🌽 ਮੱਕੀ: ₹2,090 / ਕੁਇੰਟਲ",
      chanaTicker: "🌱 ਛੋਲੇ: ₹5,440 / ਕੁਇੰਟਲ",
      mustardTicker: "🌻 ਸਰ੍ਹੋਂ: ₹5,650 / ਕੁਇੰਟਲ",
      farmerName: "ਰਮੇਸ਼ ਚੰਦ",
      farmerCode: "ਕਿਸਾਨ ਕੋਡ",
      land: "ਜ਼ਮੀਨ",
      landVal: "4.5 ਏਕੜ",
      village: "ਪਿੰਡ: ਨੀਲੋਖੇੜੀ (ਕਰਨਾਲ)",
      verifiedBadge: "✓ ਮੇਰੀ ਫਸਲ ਮੇਰਾ ਬਿਓਰਾ ਪ੍ਰਮਾਣਿਤ",
      dbtBadge: "SBI ਡੀ.ਬੀ.ਟੀ. ਐਕਟਿਵ (A/c ...5019)",
      tab1: "ਖਰੀਦ ਸਲਾਟ ਤੇ ਟੋਕਨ",
      tab2: "📍 ਨੇੜਲੇ ਖਰੀਦ ਕੇਂਦਰ",
      tab3: "ਲਾਈਵ ਕਤਾਰ ਸਥਿਤੀ ਤੇ ਸਮਾਂ",
      tab4: "ਜੇ-ਫਾਰਮ ਤੇ ਬੈਂਕ ਭੁਗਤਾਨ",
      bookingTitle: "ਖਰੀਦ ਸਲਾਟ ਅਤੇ ਡਿਜੀਟਲ ਟੋਕਨ ਬੁਕਿੰਗ",
      bookingSubtitle: "ਮੰਡੀ ਵਿੱਚ ਬਿਨਾਂ ਕਤਾਰ ਦੇ ਆਪਣਾ ਡਿਜੀਟਲ ਸਲਾਟ ਚੁਣੋ।",
      cropLabel: "ਖਰੀਦ ਲਈ ਫਸਲ",
      cropOptPaddy: "ਝੋਨਾ ਗ੍ਰੇਡ-ਏ - ₹2,300 / ਕੁਇੰਟਲ",
      cropOptWheat: "ਕਣਕ FAQ - ₹2,275 / ਕੁਇੰਟਲ",
      cropOptMaize: "ਮੱਕੀ ਹਾਈਬ੍ਰਿਡ - ₹2,090 / ਕੁਇੰਟਲ",
      cropOptChana: "ਛੋਲੇ (ਚਣਾ) - ₹5,440 / ਕੁਇੰਟਲ",
      cropOptMustard: "ਸਰ੍ਹੋਂ - ₹5,650 / ਕੁਇੰਟਲ",
      qtyLabel: "ਅਨੁਮਾਨਿਤ ਮਾਤਰਾ (ਕੁਇੰਟਲ)",
      qtyPlaceholder: "ਉਦਾ. 50",
      hubLabel: "ਖਰੀਦ ਕੇਂਦਰ / ਅਨਾਜ ਮੰਡੀ",
      hubOpt1: "PC-101: ਕਰਨਾਲ ਕੇਂਦਰੀ ਖਰੀਦ ਕੇਂਦਰ",
      hubOpt2: "PC-102: ਘਰੌਂਡਾ ਮੰਡੀ ਕੇਂਦਰ",
      hubOpt3: "PC-103: ਤਰਾਵੜੀ ਅਨਾਜ ਮੰਡੀ",
      slotLabel: "ਪਹੁੰਚਣ ਦਾ ਸਮਾਂ ਸਲਾਟ",
      slotOpt1: "ਅੱਜ 09:00 AM - 10:00 AM (8 ਬਾਕੀ)",
      slotOpt2: "ਅੱਜ 10:00 AM - 11:00 AM (14 ਬਾਕੀ)",
      slotOpt3: "ਅੱਜ 11:00 AM - 12:00 PM (4 ਬਾਕੀ)",
      slotOpt4: "ਅੱਜ 02:00 PM - 03:00 PM (18 ਬਾਕੀ)",
      vehicleLabel: "ਵਾਹਨ / ਟਰਾਲੀ ਨੰਬਰ",
      phoneLabel: "ਕਿਸਾਨ ਮੋਬਾਈਲ ਨੰਬਰ (ਆਧਾਰ ਲਿੰਕ)",
      bookBtn: "ਸਲਾਟ ਬੁੱਕ ਕਰੋ ਤੇ ਟੋਕਨ ਲਵੋ",
      calcTitle: "ਅਨੁਮਾਨਿਤ ਸਰਕਾਰੀ MSP ਭੁਗਤਾਨ",
      calcSubtitle: "ਸਿੱਧਾ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ ਤਬਾਦਲਾ (DBT)।",
      mspRateLabel: "ਲਾਗੂ MSP ਦਰ:",
      moistureNormLabel: "ਨਮੀ ਮਾਪਦੰਡ:",
      moistureNormVal: "≤ 14.0% (ਗ੍ਰੇਡ ਏ ਮਾਪਦੰਡ)",
      foreignMatterLabel: "ਕੂੜਾ-ਕਰਕਟ ਸੀਮਾ:",
      foreignMatterVal: "≤ 1.0% ਪ੍ਰਵਾਨਿਤ",
      totalPayoutLabel: "ਕੁੱਲ ਭੁਗਤਾਨ (DBT):",
      instructionTitle: "ਖਰੀਦ ਨਿਰਦੇਸ਼:",
      instruction1: "1. ਬੁੱਕ ਕੀਤੇ ਸਮੇਂ ਤੇ ਕੇਂਦਰ ਗੇਟ 'ਤੇ ਪਹੁੰਚੋ।",
      instruction2: "2. ਕਾਊਂਟਰ 2 'ਤੇ ਡਿਜੀਟਲ ਨਮੀ ਦੀ ਜਾਂਚ ਕਰਵਾਓ।",
      instruction3: "3. ਧਰਮਕੰਡੇ 'ਤੇ ਤੋਲ ਕਰਵਾ ਕੇ ਡਿਜੀਟਲ ਜੇ-ਫਾਰਮ ਰਸੀਦ ਪ੍ਰਾਪਤ ਕਰੋ।",
      ticketCardTitle: "ਤੁਹਾਡਾ ਡਿਜੀਟਲ ਕਤਾਰ ਟੋਕਨ",
      ticketCardSubtitle: "ਸਮਾਰਟ AI ਲਾਈਵ ਕਤਾਰ ਟਰੈਕਰ।",
      ticketHeader: "🏛️ ਕਰਨਾਲ ਕੇਂਦਰੀ ਖਰੀਦ ਕੇਂਦਰ • ਲੇਨ 2",
      assignedLane: "ਅਲਾਟ ਕੀਤਾ ਕਾਊਂਟਰ: ਕਾਊਂਟਰ 2 (Moisture Lab)",
      currServing: "ਮੌਜੂਦਾ ਟੋਕਨ",
      estTime: "ਉਡੀਕ ਦਾ ਸਮਾਂ",
      aheadCount: "ਅੱਗੇ ਕਿਸਾਨ",
      aheadVal: "3 ਕਿਸਾਨ",
      step1: "ਸਲਾਟ ਬੁੱਕ",
      step2: "ਗੇਟ ਐਂਟਰੀ",
      step3: "ਨਮੀ ਟੈਸਟ",
      step4: "ਧਰਮਕੰਡਾ ਤੋਲ",
      step5: "ਬੈਂਕ ਭੁਗਤਾਨ",
      voiceNotice: "📢 ਜਦੋਂ ਤੁਹਾਡਾ ਟੋਕਨ ਬੁਲਾਇਆ ਜਾਵੇਗਾ, ਸਪੀਕਰ ਅਤੇ SMS ਰਾਹੀਂ ਆਵਾਜ਼ ਵਿੱਚ ਸੂਚਨਾ ਮਿਲੇਗੀ।",
      qualityTitle: "ਲਾਈਵ ਗੁਣਵੱਤਾ ਅਤੇ ਤੋਲ ਰਿਪੋਰਟ",
      qualitySubtitle: "ਲੈਬ ਨਮੀ ਅਤੇ ਇਲੈਕਟ੍ਰਾਨਿਕ ਵੇਅਬ੍ਰਿਜ ਡਾਟਾ।",
      moistureTestLabel: "ਨਮੀ ਮੀਟਰ ਰੀਡਿੰਗ:",
      gradePassBadge: "11.8% (ਗ੍ਰੇਡ-ਏ ਪਾਸ)",
      moistureDesc: "ਨਮੀ 14% ਤੋਂ ਘੱਟ ਹੈ। ਪੂਰੀ MSP ਮਿਲੇਗੀ। ਕੋਈ ਕਟੌਤੀ ਨਹੀਂ।",
      weighmentLabel: "ਇਲੈਕਟ੍ਰਾਨਿਕ ਕੰਡਾ:",
      weighmentDesc: "ਕੁੱਲ: 58.20 Qtl • ਖਾਲੀ: 8.20 Qtl = ਸ਼ੁੱਧ: 50.00 Qtl",
      dbtAmountLabel: "ਡੀਬੀਟੀ ਭੁਗਤਾਨ ਰਕਮ:",
      dbtTransferDesc: "PFMS ਰਾਹੀਂ ਸਟੇਟ ਬੈਂਕ ਆਫ਼ ਇੰਡੀਆ ਖਾਤੇ (...5019) ਵਿੱਚ ਜਮ੍ਹਾਂ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ।",
      recordsTitle: "ਜੇ-ਫਾਰਮ ਅਤੇ ਸਰਕਾਰੀ ਰਸੀਦਾਂ",
      recordsSubtitle: "ਪ੍ਰਮਾਣਿਤ ਖਰੀਦ ਰਸੀਦਾਂ ਅਤੇ ਬੈਂਕ ਲੈਣ-ਦੇਣ ਦਾ ਵੇਰਵਾ।",
      voiceOn: "ਆਵਾਜ਼: ਚਾਲੂ",
      voiceOff: "ਆਵਾਜ਼: ਬੰਦ",
      gpsBannerTitle: "ਖੇਤ ਦੀ ਲੋਕੇਸ਼ਨ ਤੇ ਨੇੜਲੇ ਖਰੀਦ ਕੇਂਦਰ",
      gpsBannerSubtitle: "ਜੀਪੀਐਸ ਦੂਰੀ ਅਨੁਸਾਰ ਨੇੜਲੀਆਂ ਮੰਡੀਆਂ ਲੱਭੋ।",
      btnGpsDetect: "ਲੋਕੇਸ਼ਨ ਲੱਭੋ (GPS Detect)",
      nearestMandiTitle: "ਤੁਹਾਡੇ ਨੇੜਲੇ ਖਰੀਦ ਕੇਂਦਰ",
      nearestMandiSub: "ਸਲਾਟ ਬੁੱਕ ਕਰਨ ਲਈ ਕੇਂਦਰ ਚੁਣੋ।",
      selectMandiBtn: "ਇਹ ਕੇਂਦਰ ਚੁਣੋ",
      nearestBadgeText: "ਸਭ ਤੋਂ ਨੇੜੇ (ਤੇਜ਼)",
      loginTitle: "ਕਿਸਾਨ ਲੌਗਇਨ (Farmer Sign In)",
      loginSubtitle: "ਮੰਡੀ ਸਲਾਟ ਅਤੇ ਡੀਬੀਟੀ ਭੁਗਤਾਨ ਲਈ ਲੌਗਇਨ ਕਰੋ।",
      loginUserLabel: "ਮੋਬਾਈਲ ਨੰਬਰ ਜਾਂ ਕਿਸਾਨ ਆਈਡੀ",
      loginPinLabel: "ਸੁਰੱਖਿਆ ਪਿੰਨ / ਪਾਸਵਰਡ",
      loginBtn: "ਲੌਗਇਨ ਕਰੋ (SIGN IN)",
      demoTitle: "⚡ ਡੈਮੋ ਪ੍ਰੋਫਾਈਲ (Demo Logins)",
      noAccountText: "ਖਾਤਾ ਨਹੀਂ ਹੈ?",
      registerLinkText: "ਨਵਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ",
      signupTitle: "ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ (KYC)",
      signupSubtitle: "ਸਰਕਾਰੀ MSP ਖਰੀਦ ਲਈ ਰਜਿਸਟਰ ਕਰੋ।",
      signupNameLabel: "ਪੂਰਾ ਨਾਮ",
      signupMobileLabel: "ਮੋਬਾਈਲ ਨੰਬਰ",
      signupAadhaarLabel: "ਆਧਾਰ ਨੰਬਰ",
      signupLandLabel: "ਜ਼ਮੀਨ (ਏਕੜ)",
      signupVillageLabel: "ਪਿੰਡ ਤੇ ਜ਼ਿਲ੍ਹਾ",
      gpsFieldLabel: "GPS ਕੋਆਰਡੀਨੇਟਸ",
      bankAccLabel: "ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ",
      ifscLabel: "IFSC ਕੋਡ",
      createPinLabel: "ਨਵਾਂ ਪਿੰਨ ਬਣਾਓ",
      govVerificationNote: "ਸਰਕਾਰੀ ਡਾਟਾਬੇਸ ਨਾਲ ਸਵੈ-ਚਾਲਿਤ ਤਸਦੀਕ।",
      completeSignupBtn: "ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਪੂਰੀ ਕਰੋ",
      alreadyAccountText: "ਪਹਿਲਾਂ ਤੋਂ ਰਜਿਸਟਰਡ ਹੋ?",
      loginLinkText: "ਇੱਥੇ ਲੌਗਇਨ ਕਰੋ",
      logoutText: "ਲੌਗਆਊਟ"
    },
    mr: {
      portalTitle: "AgriQueue (अ‍ॅग्री क्यू)",
      portalSubtitle: "शेतकरी खरेदी व रांग व्यवस्थापन पोर्टल (SIH26032)",
      hindiSub: "शेतकरी खरेदी पोर्टल",
      govMsp: "शासकीय हमीभाव (MSP 2026)",
      paddyTicker: "🌾 धान (ग्रेड-ए): ₹2,300 / क्विंटल",
      wheatTicker: "🌾 गहू (FAQ): ₹2,275 / क्विंटल",
      maizeTicker: "🌽 मका: ₹2,090 / क्विंटल",
      chanaTicker: "🌱 हरभरा: ₹5,440 / क्विंटल",
      mustardTicker: "🌻 मोहरी: ₹5,650 / क्विंटल",
      farmerName: "रमेश चंद",
      farmerCode: "शेतकरी कोड",
      land: "जमीन",
      landVal: "4.5 एकर",
      village: "गाव: निलोखेडी (कर्नाल)",
      verifiedBadge: "✓ आधार पडताळणी पूर्ण",
      dbtBadge: "SBI थेट बँक हस्तांतरण सक्रिय",
      tab1: "खरेदी स्लॉट व टोकन",
      tab2: "📍 जवळची खरेदी केंद्रे",
      tab3: "थेट रांग स्थिती व वेळ",
      tab4: "खरेदी पावत्या व हमीभाव",
      bookingTitle: "खरेदी स्लॉट व डिजिटल टोकन बुकिंग",
      bookingSubtitle: "मार्केटमध्ये रांगेत न थांबता डिजिटल स्लॉट बुक करा.",
      cropLabel: "खरेदीसाठी पीक प्रकार",
      cropOptPaddy: "धान ग्रेड-ए - ₹2,300 / क्विंटल",
      cropOptWheat: "गहू FAQ - ₹2,275 / क्विंटल",
      cropOptMaize: "मका हायब्रिड - ₹2,090 / क्विंटल",
      cropOptChana: "हरभरा (चना) - ₹5,440 / क्विंटल",
      cropOptMustard: "मोहरी - ₹5,650 / क्विंटल",
      qtyLabel: "अंदाजे वजन (क्विंटल)",
      qtyPlaceholder: "उदा. 50",
      hubLabel: "खरेदी केंद्र / कृषी मंडी",
      hubOpt1: "PC-101: कर्नाल मध्यवर्ती खरेदी केंद्र",
      hubOpt2: "PC-102: घरौंडा मंडी केंद्र",
      hubOpt3: "PC-103: तरावडी धान्य बाजार",
      slotLabel: "पोहोचण्याची वेळ स्लॉट",
      slotOpt1: "आज 09:00 AM - 10:00 AM (8 स्लॉट शिल्लक)",
      slotOpt2: "आज 10:00 AM - 11:00 AM (14 स्लॉट शिल्लक)",
      slotOpt3: "आज 11:00 AM - 12:00 PM (4 स्लॉट शिल्लक)",
      slotOpt4: "आज 02:00 PM - 03:00 PM (18 स्लॉट शिल्लक)",
      vehicleLabel: "वाहन / ट्रॅक्टर नंबर",
      phoneLabel: "नोंदणीकृत मोबाईल नंबर",
      bookBtn: "स्लॉट बुक करा व टोकन मिळवा",
      calcTitle: "अपेक्षित हमीभाव (MSP) रक्कम",
      calcSubtitle: "थेट बँक हस्तांतरण (DBT) अंदाज.",
      mspRateLabel: "शासकीय हमीभाव दर:",
      moistureNormLabel: "ओलावा मर्यादा:",
      moistureNormVal: "≤ 14.0% (ग्रेड ए मानक)",
      foreignMatterLabel: "कचरा मर्यादा:",
      foreignMatterVal: "≤ 1.0% अनुमत",
      totalPayoutLabel: "एकूण बँक रक्कम (DBT):",
      instructionTitle: "खरेदी मार्गदर्शक सूचना:",
      instruction1: "1. बुक केलेल्या वेळेत केंद्राच्या गेटवर पोहोचा.",
      instruction2: "2. काउंटर २ वर डिजिटल ओलावा तपासणी पूर्ण करा.",
      instruction3: "3. इलेक्ट्रॉनिक काट्यावर वजन करून डिजिटल पावती घ्या.",
      ticketCardTitle: "तुमचे डिजिटल रांग टोकन",
      ticketCardSubtitle: "स्मार्ट AI थेट रांग ट्रॅकर.",
      ticketHeader: "🏛️ कर्नाल मध्यवर्ती खरेदी केंद्र • लेन 2",
      assignedLane: "काउंटर: काउंटर २ (Moisture Lab)",
      currServing: "सध्याचे टोकन",
      estTime: "अंदाजे वेळ",
      aheadCount: "पुढील शेतकरी",
      aheadVal: "3 शेतकरी",
      step1: "स्लॉट बुक",
      step2: "गेट प्रवेश",
      step3: "ओलावा तपासणी",
      step4: "काटा वजन",
      step5: "बँक जमा",
      voiceNotice: "📢 तुमचे टोकन पुकारल्यावर लाऊडस्पीकर व SMS द्वारे सूचना मिळेल.",
      qualityTitle: "गुणवत्ता व वजन तपासणी",
      qualitySubtitle: "डिजिटल ओलावा मीटर व इलेक्ट्रॉनिक काटा डेटा.",
      moistureTestLabel: "ओलावा तपासणी:",
      gradePassBadge: "11.8% (ग्रेड-ए पास)",
      moistureDesc: "ओलावा 14% पेक्षा कमी आहे. पूर्ण हमीभाव मिळेल. शून्य कपात.",
      weighmentLabel: "इलेक्ट्रॉनिक काटा:",
      weighmentDesc: "एकूण वजन: 58.20 Qtl • निव्वळ वजन: 50.00 Qtl",
      dbtAmountLabel: "DBT हस्तांतरण रक्कम:",
      dbtTransferDesc: "PFMS द्वारे स्टेट बँक ऑफ इंडिया खात्यात (...5019) जमा केली जात आहे.",
      recordsTitle: "खरेदी पावत्या व बँक तपशील",
      recordsSubtitle: "प्रमाणित शासकीय पावत्या व बँक व्यवहार नोंद.",
      voiceOn: "आवाज: सुरू",
      voiceOff: "आवाज: बंद",
      gpsBannerTitle: "शेताचे स्थान व जवळची खरेदी केंद्रे",
      gpsBannerSubtitle: "थेट जीपीएस अंतरावरून जवळच्या कृषी मंड्या शोधा.",
      btnGpsDetect: "स्थान शोधा (GPS Detect)",
      nearestMandiTitle: "तुमच्या जवळची खरेदी केंद्रे",
      nearestMandiSub: "स्लॉट बुक करण्यासाठी केंद्र निवडा.",
      selectMandiBtn: "हे केंद्र निवडा",
      nearestBadgeText: "सर्वात जवळचे (जलद)",
      loginTitle: "शेतकरी लॉगिन (Farmer Sign In)",
      loginSubtitle: "मंडी स्लॉट आणि बँक जमा रकमेसाठी लॉगिन करा.",
      loginUserLabel: "मोबाईल नंबर किंवा शेतकरी आयडी",
      loginPinLabel: "सुरक्षा पिन / पासवर्ड",
      loginBtn: "लॉगिन करा (SIGN IN)",
      demoTitle: "⚡ डेमो शेतकरी प्रोफाईल (Demo Logins)",
      noAccountText: "खाते नाही?",
      registerLinkText: "नवीन शेतकरी नोंदणी करा",
      signupTitle: "नवीन शेतकरी नोंदणी (KYC)",
      signupSubtitle: "शासकीय हमीभाव खरेदीसाठी नोंदणी करा.",
      signupNameLabel: "पूर्ण नाव",
      signupMobileLabel: "मोबाईल नंबर",
      signupAadhaarLabel: "आधार नंबर",
      signupLandLabel: "जमीन (एकर)",
      signupVillageLabel: "गाव व जिल्हा",
      gpsFieldLabel: "GPS स्थान",
      bankAccLabel: "बँक खाते क्रमांक",
      ifscLabel: "IFSC कोड",
      createPinLabel: "नवीन पिन तयार करा",
      govVerificationNote: "शासकीय डेटाबेसद्वारे स्वयंचलित पडताळणी.",
      completeSignupBtn: "नोंदणी पूर्ण करा",
      alreadyAccountText: "आधीच नोंदणी केली आहे?",
      loginLinkText: "येथे लॉगिन करा",
      logoutText: "लॉगआउट"
    },
    kn: {
      portalTitle: "AgriQueue (ಅಗ್ರಿ ಕ್ಯೂ)",
      portalSubtitle: "ರೈತರ ಖರೀದಿ ಮತ್ತು ಸರದಿ ನಿರ್ವಹಣಾ ಪೋರ್ಟಲ್ (SIH26032)",
      hindiSub: "ರೈತರ ಖರೀದಿ ಪೋರ್ಟಲ್",
      govMsp: "ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ (MSP 2026)",
      paddyTicker: "🌾 ಭತ್ತ (ಗ್ರೇಡ್-ಎ): ₹2,300 / ಕ್ವಿಂಟಾಲ್",
      wheatTicker: "🌾 ಗೋಧಿ (FAQ): ₹2,275 / ಕ್ವಿಂಟಾಲ್",
      maizeTicker: "🌽 ಜೋಳ: ₹2,090 / ಕ್ವಿಂಟಾಲ್",
      chanaTicker: "🌱 ಕಡಲೆ: ₹5,440 / ಕ್ವಿಂಟಾಲ್",
      mustardTicker: "🌻 ಸಾಸಿವೆ: ₹5,650 / ಕ್ವಿಂಟಾಲ್",
      farmerName: "ರಮೇಶ್ ಚಂದ್",
      farmerCode: "ರೈತ ಕೋಡ್",
      land: "ಜಮೀನು",
      landVal: "4.5 ಎಕರೆ",
      village: "ಗ್ರಾಮ: ನೀಲೋಖೇರಿ (ಕರ್ನಾಲ್)",
      verifiedBadge: "✓ ಆಧಾರ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
      dbtBadge: "SBI ನೇರ DBT ಸಕ್ರಿಯವಾಗಿದೆ",
      tab1: "ಖರೀದಿ ಸ್ಲಾಟ್ & ಟೋಕನ್",
      tab2: "📍 ಸಮೀಪದ ಖರೀದಿ ಕೇಂದ್ರಗಳು",
      tab3: "ಲೈವ್ ಸರದಿ & ಕಾಯುವ ಸಮಯ",
      tab4: "ಖರೀದಿ ರಸೀದಿಗಳು & ಬ್ಯಾಂಕ್ ಪಾವತಿ",
      bookingTitle: "ಖರೀದಿ ಸ್ಲಾಟ್ & ಡಿಜಿಟಲ್ ಟೋಕನ್ ಬುಕಿಂಗ್",
      bookingSubtitle: "ಮಂಡಿಯಲ್ಲಿ ಸರದಿಯಲ್ಲಿ ಕಾಯದೆ ಡಿಜಿಟಲ್ ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡಿ.",
      cropLabel: "ಖರೀದಿಗೆ ಬೆಳೆ ಪ್ರಕಾರ",
      cropOptPaddy: "ಭತ್ತ ಗ್ರೇಡ್-ಎ - ₹2,300 / ಕ್ವಿಂಟಾಲ್",
      cropOptWheat: "ಗೋಧಿ FAQ - ₹2,275 / ಕ್ವಿಂಟಾಲ್",
      cropOptMaize: "ಜೋಳ ಹೈಬ್ರಿಡ್ - ₹2,090 / ಕ್ವಿಂಟಾಲ್",
      cropOptChana: "ಕಡಲೆ - ₹5,440 / ಕ್ವಿಂಟಾಲ್",
      cropOptMustard: "ಸಾಸಿವೆ - ₹5,650 / ಕ್ವಿಂಟಾಲ್",
      qtyLabel: "ಅಂದಾಜು ತೂಕ (ಕ್ವಿಂಟಾಲ್)",
      qtyPlaceholder: "ಉದಾ. 50",
      hubLabel: "ಖರೀದಿ ಕೇಂದ್ರ / ಮಂಡಿ",
      hubOpt1: "PC-101: ಕರ್ನಾಲ್ ಕೇಂದ್ರ ಹಬ್ (ವೇಗವಾದದ್ದು)",
      hubOpt2: "PC-102: ಘರೌಂಡಾ ಮಂಡಿ ಕೇಂದ್ರ",
      hubOpt3: "PC-103: ತರಾವಡಿ ಧಾನ್ಯ ಮಾರುಕಟ್ಟೆ",
      slotLabel: "ಆಗಮನ ಸಮಯ ಸ್ಲಾಟ್",
      slotOpt1: "ಇಂದು 09:00 AM - 10:00 AM (8 ಸ್ಲಾಟ್‌ಗಳು ಬಾಕಿ)",
      slotOpt2: "ಇಂದು 10:00 AM - 11:00 AM (14 ಸ್ಲಾಟ್‌ಗಳು ಬಾಕಿ)",
      slotOpt3: "ಇಂದು 11:00 AM - 12:00 PM (4 ಸ್ಲಾಟ್‌ಗಳು ಬಾಕಿ)",
      slotOpt4: "ಇಂದು 02:00 PM - 03:00 PM (18 ಸ್ಲಾಟ್‌ಗಳು ಬಾಕಿ)",
      vehicleLabel: "ವಾಹನ / ಟ್ರಾಲಿ ಸಂಖ್ಯೆ",
      phoneLabel: "ರೈತರ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
      bookBtn: "ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡಿ & ಟೋಕನ್ ಪಡೆಯಿರಿ",
      calcTitle: "ನಿರೀಕ್ಷಿತ ಸರ್ಕಾರಿ MSP ಮೊತ್ತ",
      calcSubtitle: "ನೇರ ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ (DBT) ಅಂದಾಜು.",
      mspRateLabel: "ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ:",
      moistureNormLabel: "ತೇವಾಂಶ ಮಿತಿ:",
      moistureNormVal: "≤ 14.0% (ಗ್ರೇಡ್ ಎ ಮಾನದಂಡ)",
      foreignMatterLabel: "ಕಲ್ಮಶ ಮಿತಿ:",
      foreignMatterVal: "≤ 1.0% ಅನುಮತಿಸಲಾಗಿದೆ",
      totalPayoutLabel: "ಒಟ್ಟು DBT ಪಾವತಿ:",
      instructionTitle: "ಖರೀದಿ ಮಾರ್ಗಸೂಚಿಗಳು:",
      instruction1: "1. ಬುಕ್ ಮಾಡಿದ ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಕೇಂದ್ರದ ಗೇಟ್‌ಗೆ ಬನ್ನಿ.",
      instruction2: "2. ಕೌಂಟರ್ 2 ರಲ್ಲಿ ತೇವಾಂಶ ಪರೀಕ್ಷೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.",
      instruction3: "3. ಎಲೆಕ್ಟ್ರಾನಿಕ್ ತೂಕದ ಯಂತ್ರದಲ್ಲಿ ತೂಕ ಮಾಡಿಸಿ ಡಿಜಿಟಲ್ ರಸೀದಿ ಪಡೆಯಿರಿ.",
      ticketCardTitle: "ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಸರದಿ ಟೋಕನ್",
      ticketCardSubtitle: "ಸ್ಮಾರ್ಟ್ AI ಲೈವ್ ಸರದಿ ಟ್ರ್ಯಾಕರ್.",
      ticketHeader: "🏛️ ಕರ್ನಾಲ್ ಕೇಂದ್ರ ಖರೀದಿ ಕೇಂದ್ರ • ಲೇನ್ 2",
      assignedLane: "ಕೌಂಟರ್: ಕೌಂಟರ್ 2 (Moisture Lab)",
      currServing: "ಪ್ರಸ್ತುತ ಟೋಕನ್",
      estTime: "ಕಾಯುವ ಸಮಯ",
      aheadCount: "ಮುಂದಿರುವ ರೈತರು",
      aheadVal: "3 ರೈತರು",
      step1: "ಸ್ಲಾಟ್ ಬುಕ್",
      step2: "ಗೇಟ್ ಎಂಟ್ರಿ",
      step3: "ತೇವಾಂಶ ಪರೀಕ್ಷೆ",
      step4: "ತೂಕ",
      step5: "ಬ್ಯಾಂಕ್ ಪಾವತಿ",
      voiceNotice: "📢 ನಿಮ್ಮ ಟೋಕನ್ ಕರೆದಾಗ ಧ್ವನಿ ಪ್ರಕಟಣೆ ಮತ್ತು SMS ಬರುತ್ತದೆ.",
      qualityTitle: "ಗುಣಮಟ್ಟ ಮತ್ತು ತೂಕ ವಿವರ",
      qualitySubtitle: "ಡಿಜಿಟಲ್ ತೇವಾಂಶ ಮೀಟರ್ & ಎಲೆಕ್ಟ್ರಾನಿಕ್ ತೂಕ ಡೇಟಾ.",
      moistureTestLabel: "ತೇವಾಂಶ ಪರೀಕ್ಷೆ:",
      gradePassBadge: "11.8% (ಗ್ರೇಡ್-ಎ ಪಾಸ್)",
      moistureDesc: "ತೇವಾಂಶವು 14% ಕ್ಕಿಂತ ಕಡಿಮೆಯಿದೆ. ಪೂರ್ಣ MSP ಸಿಗುತ್ತದೆ.",
      weighmentLabel: "ಎಲೆಕ್ಟ್ರಾನಿಕ್ ತೂಕ:",
      weighmentDesc: "ಒಟ್ಟು: 58.20 Qtl • ನಿವ್ವಳ: 50.00 Qtl",
      dbtAmountLabel: "DBT ಪಾವತಿ ಮೊತ್ತ:",
      dbtTransferDesc: "PFMS ಮೂಲಕ ಸ್ಟೇಟ್ ಬ್ಯಾಂಕ್ ಆಫ್ ಇಂಡಿಯಾ ಖಾತೆಗೆ (...5019) ಜಮೆಯಾಗುತ್ತಿದೆ.",
      recordsTitle: "ಖರೀದಿ ರಸೀದಿಗಳು & ಬ್ಯಾಂಕ್ ದಾಖಲೆಗಳು",
      recordsSubtitle: "ಪ್ರಮಾಣೀಕೃತ ಖರೀದಿ ರಸೀದಿಗಳು ಮತ್ತು ಬ್ಯಾಂಕ್ ವಹಿವಾಟು.",
      voiceOn: "ಧ್ವನಿ: ಆನ್",
      voiceOff: "ಧ್ವನಿ: ಆಫ್",
      gpsBannerTitle: "ಜಮೀನಿನ ಸ್ಥಳ & ಸಮೀಪದ ಖರೀದಿ ಕೇಂದ್ರಗಳು",
      gpsBannerSubtitle: "ಲೈವ್ ಜಿಪಿಎಸ್ ದೂರದ ಪ್ರಕಾರ ಸಮೀಪದ ಮಂಡಿಗಳನ್ನು ಹುಡುಕಿ.",
      btnGpsDetect: "ಸ್ಥಳ ಪತ್ತೆ ಮಾಡಿ (GPS Detect)",
      nearestMandiTitle: "ನಿಮ್ಮ ಸಮೀಪದ ಖರೀದಿ ಕೇಂದ್ರಗಳು",
      nearestMandiSub: "ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡಲು ಕೇಂದ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      selectMandiBtn: "ಈ ಕೇಂದ್ರ ಆಯ್ಕೆಮಾಡಿ",
      nearestBadgeText: "ಅತ್ಯಂತ ಸಮೀಪದ (ವೇಗ)",
      loginTitle: "ರೈತರ ಲಾಗಿನ್ (Farmer Sign In)",
      loginSubtitle: "ಸ್ಲಾಟ್ ಬುಕಿಂಗ್ ಮತ್ತು ಬ್ಯಾಂಕ್ ಜಮೆಗಾಗಿ ಲಾಗಿನ್ ಆಗಿ.",
      loginUserLabel: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಅಥವಾ ರೈತ ID",
      loginPinLabel: "ಸೆಕ್ಯುರಿಟಿ ಪಿನ್ / ಪಾಸ್‌ವರ್ಡ್",
      loginBtn: "ಲಾಗಿನ್ ಮಾಡಿ (SIGN IN)",
      demoTitle: "⚡ ಡೆಮೊ ಪ್ರೊಫೈಲ್ಸ್ (Demo Logins)",
      noAccountText: "ಖಾತೆ ಇಲ್ಲವೇ?",
      registerLinkText: "ಹೊಸ ರೈತರ ನೋಂದಣಿ ಮಾಡಿ",
      signupTitle: "ಹೊಸ ರೈತರ ನೋಂದಣಿ (Registration)",
      signupSubtitle: "ಸರ್ಕಾರಿ MSP ಖರೀದಿಗಾಗಿ ನೋಂದಾಯಿಸಿ.",
      signupNameLabel: "ಪೂರ್ಣ ಹೆಸರು",
      signupMobileLabel: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
      signupAadhaarLabel: "ಆಧಾರ್ ಸಂಖ್ಯೆ",
      signupLandLabel: "ಜಮೀನು (ಎಕರೆ)",
      signupVillageLabel: "ಗ್ರಾಮ & ಜಿಲ್ಲೆ",
      gpsFieldLabel: "GPS ಸ್ಥಳ",
      bankAccLabel: "ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ",
      ifscLabel: "IFSC ಕೋಡ್",
      createPinLabel: "ಹೊಸ ಪಿನ್ ರಚಿಸಿ",
      govVerificationNote: "ಸರ್ಕಾರಿ ಡೇಟಾಬೇಸ್‌ನೊಂದಿಗೆ ಸ್ವಯಂಚಾಲಿತ ಪರಿಶೀಲನೆ.",
      completeSignupBtn: "ನೋಂದಣಿ ಪೂರ್ಣಗೊಳಿಸಿ",
      alreadyAccountText: "ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಲಾಗಿದೆಯೇ?",
      loginLinkText: "ಇಲ್ಲಿ ಲಾಗಿನ್ ಮಾಡಿ",
      logoutText: "ಲಾಗ್‌ಔಟ್"
    },
    bn: {
      portalTitle: "AgriQueue (এগ্রিকিউ)",
      portalSubtitle: "স্মার্ট কৃষক সংগ্রহ ও সারি ব্যবস্থাপনা পোর্টাল (SIH26032)",
      hindiSub: "কৃষক সংগ্রহ পোর্টাল",
      govMsp: "সরকারি সহায়ক মূল্য (MSP 2026)",
      paddyTicker: "🌾 ধান (গ্রেড-এ): ₹2,300 / কুইন্টাল",
      wheatTicker: "🌾 গম (FAQ): ₹2,275 / কুইন্টাল",
      maizeTicker: "🌽 ভুট্টা: ₹2,090 / কুইন্টাল",
      chanaTicker: "🌱 ছোলা: ₹5,440 / কুইন্টাল",
      mustardTicker: "🌻 সরিষা: ₹5,650 / কুইন্টাল",
      farmerName: "রমেশ চন্দ",
      farmerCode: "কৃষক কোড",
      land: "জমি",
      landVal: "4.5 একর",
      village: "গ্রাম: নিলোক্খেরী (কারনাল)",
      verifiedBadge: "✓ আধার যাচাইকৃত",
      dbtBadge: "SBI সরাসরি DBT সক্রিয়",
      tab1: "সংগ্রহ স্লট ও টোকেন",
      tab2: "📍 নিকটস্থ সংগ্রহ কেন্দ্র",
      tab3: "লাইভ সারি ও সময়",
      tab4: "সংগ্রহের রসিদ ও অর্থ",
      bookingTitle: "সংগ্রহ স্লট ও ডিজিটাল টোকেন বুকিং",
      bookingSubtitle: "মান্ডিতে লাইনে না দাঁড়িয়ে ডিজিটাল স্লট বুক করুন।",
      cropLabel: "সংগ্রহের জন্য ফসল",
      cropOptPaddy: "ধান গ্রেড-এ - ₹2,300 / কুইন্টাল",
      cropOptWheat: "গম FAQ - ₹2,275 / কুইন্টাল",
      cropOptMaize: "ভুট্টা - ₹2,090 / কুইন্টাল",
      cropOptChana: "ছোলা - ₹5,440 / কুইন্টাল",
      cropOptMustard: "সরিষা - ₹5,650 / কুইন্টাল",
      qtyLabel: "আনুমানিক ওজন (কুইন্টাল)",
      qtyPlaceholder: "যেমন 50",
      hubLabel: "সংগ্রহ কেন্দ্র / মান্ডি",
      hubOpt1: "PC-101: কারনাল কেন্দ্রীয় সংগ্রহ কেন্দ্র",
      hubOpt2: "PC-102: ঘারোন্ডা মান্ডি কেন্দ্র",
      hubOpt3: "PC-103: তারাওরি শস্য বাজার",
      slotLabel: "আগমনের সময় স্লট",
      slotOpt1: "আজ 09:00 AM - 10:00 AM (8 টি অবশিষ্ট)",
      slotOpt2: "আজ 10:00 AM - 11:00 AM (14 টি অবশিষ্ট)",
      slotOpt3: "আজ 11:00 AM - 12:00 PM (4 টি অবশিষ্ট)",
      slotOpt4: "আজ 02:00 PM - 03:00 PM (18 টি অবশিষ্ট)",
      vehicleLabel: "গাড়ি / ট্রলি নম্বর",
      phoneLabel: "নিবন্ধিত মোবাইল নম্বর",
      bookBtn: "স্লট বুক করুন ও টোকেন নিন",
      calcTitle: "প্রত্যাশিত সরকারি MSP অর্থ",
      calcSubtitle: "সরাসরি ব্যাংক ট্রান্সফার (DBT) হিসাব।",
      mspRateLabel: "সরকারি MSP दर:",
      moistureNormLabel: "আর্দ্রতা সীমা:",
      moistureNormVal: "≤ 14.0% (গ্রেড এ মান)",
      foreignMatterLabel: "অপদ্রব্য সীমা:",
      foreignMatterVal: "≤ 1.0% অনুমোদিত",
      totalPayoutLabel: "মোট DBT অর্থ:",
      instructionTitle: "সংগ্রহের নির্দেশিকা:",
      instruction1: "1. বুক করা সময়ে কেন্দ্রের গেটে পৌঁছান।",
      instruction2: "2. কাউন্টার ২-এ ডিজিটাল আর্দ্রতা পরীক্ষা করান।",
      instruction3: "3. ওজন স্কেলে ওজন করিয়ে ডিজিটাল রসিদ নিন।",
      ticketCardTitle: "আপনার ডিজিটাল সারি টোকেন",
      ticketCardSubtitle: "স্মার্ট AI লাইভ সারি ট্র্যাকার।",
      ticketHeader: "🏛️ কারনাল কেন্দ্রীয় সংগ্রহ কেন্দ্র • লেন ২",
      assignedLane: "কাউন্টার: কাউন্টার ২ (Moisture Lab)",
      currServing: "বর্তমান টোকেন",
      estTime: "অপেক্ষার সময়",
      aheadCount: "সামনে কৃষক",
      aheadVal: "3 জন কৃষক",
      step1: "স্লট বুক",
      step2: "গেট এন্ট্রি",
      step3: "আর্দ্রতা পরীক্ষা",
      step4: "ওজন মাপ",
      step5: "ব্যাংক জমা",
      voiceNotice: "📢 আপনার টোকেন ডাকার সময় মাইকে ও SMS-এ ঘোষণা করা হবে।",
      qualityTitle: "গুণমান ও ওজন রিপোর্ট",
      qualitySubtitle: "ডিজিটাল আর্দ্রতা পরিমাপ ও ওজন স্কেলের তথ্য।",
      moistureTestLabel: "আর্দ্রতা পরীক্ষা:",
      gradePassBadge: "11.8% (গ্রেড-এ পাস)",
      moistureDesc: "আর্দ্রতা ১৪% এর কম। সম্পূর্ণ MSP পাওয়া যাবে।",
      weighmentLabel: "ইলেকট্রনিক স্কেল:",
      weighmentDesc: "মোট ওজন: 58.20 Qtl • নেট ওজন: 50.00 Qtl",
      dbtAmountLabel: "DBT পেমেন্ট পরিমাণ:",
      dbtTransferDesc: "PFMS-এর মাধ্যমে স্টেট ব্যাংক অফ ইন্ডিয়া অ্যাকাউন্টে (...5019) জমা হচ্ছে।",
      recordsTitle: "সংগ্রহ রসিদ ও ব্যাংক বিবরণী",
      recordsSubtitle: "প্রত্যয়িত সরকারি রসিদ ও পেমেন্ট রেকর্ড।",
      voiceOn: "ভয়েস: অন",
      voiceOff: "ভয়েস: অফ",
      gpsBannerTitle: "খামারের অবস্থান ও নিকটস্থ সংগ্রহ কেন্দ্র",
      gpsBannerSubtitle: "লাইভ জিপিএস দূরত্ব অনুযায়ী নিকটতম মান্ডি খুঁজুন।",
      btnGpsDetect: "লোকেশন খুঁজুন (GPS Detect)",
      nearestMandiTitle: "নিকটবর্তী সরকারি সংগ্রহ কেন্দ্র",
      nearestMandiSub: "স্লট বুক করতে কেন্দ্র নির্বাচন করুন।",
      selectMandiBtn: "এই কেন্দ্রটি নির্বাচন করুন",
      nearestBadgeText: "সবচেয়ে কাছে (দ্রুততম)",
      loginTitle: "কৃষক লগইন (Farmer Sign In)",
      loginSubtitle: "মান্ডি স্লট এবং ব্যাংক পেমেন্টের জন্য লগইন করুন।",
      loginUserLabel: "মোবাইল নম্বর বা কৃষক আইডি",
      loginPinLabel: "নিরাপত্তা পিন / পাসওয়ার্ড",
      loginBtn: "লগইন করুন (SIGN IN)",
      demoTitle: "⚡ ডেমো কৃষক প্রোফাইল (Demo Logins)",
      noAccountText: "অ্যাকাউন্ট নেই?",
      registerLinkText: "নতুন কৃষক নিবন্ধন করুন",
      signupTitle: "নতুন কৃষক নিবন্ধন (Registration)",
      signupSubtitle: "সরকারি MSP সংগ্রহের জন্য নিবন্ধন করুন।",
      signupNameLabel: "সম্পূর্ণ নাম",
      signupMobileLabel: "মোবাইল নম্বর",
      signupAadhaarLabel: "আধার নম্বর",
      signupLandLabel: "জমি (একর)",
      signupVillageLabel: "গ্রাম ও জেলা",
      gpsFieldLabel: "GPS অবস্থান",
      bankAccLabel: "ব্যাংক অ্যাকাউন্ট নম্বর",
      ifscLabel: "IFSC কোড",
      createPinLabel: "নতুন পিন তৈরি করুন",
      govVerificationNote: "সরকারি ডেটাবেসের সাথে স্বয়ংক্রিয় যাচাইকরণ।",
      completeSignupBtn: "নিবন্ধন সম্পূর্ণ করুন",
      alreadyAccountText: "ইতিমধ্যে নিবন্ধিত?",
      loginLinkText: "এখানে লগইন করুন",
      logoutText: "লগআউট"
    },
    gu: {
      portalTitle: "AgriQueue (એગ્રી કતાર)",
      portalSubtitle: "સ્માર્ટ ખેડૂત ખરીદી અને કતાર વ્યવસ્થાપન પોર્ટલ (SIH26032)",
      hindiSub: "ખેડૂત ખરીદી પોર્ટલ",
      govMsp: "સરકારી ટેકાના ભાવ (MSP 2026)",
      paddyTicker: "🌾 ડાંગર (ગ્રેડ-એ): ₹2,300 / ક્વિન્ટલ",
      wheatTicker: "🌾 ઘઉં (FAQ): ₹2,275 / ક્વિન્ટલ",
      maizeTicker: "🌽 મકાઈ: ₹2,090 / ક્વિન્ટલ",
      chanaTicker: "🌱 ચણા: ₹5,440 / ક્વિન્ટલ",
      mustardTicker: "🌻 રાયડો: ₹5,650 / ક્વિન્ટલ",
      farmerName: "રમેશ ચંદ",
      farmerCode: "ખેડૂત કોડ",
      land: "જમીન",
      landVal: "4.5 એકર",
      village: "ગામ: નીલોખેરી (કરનાલ)",
      verifiedBadge: "✓ આધાર ચકાસાયેલ",
      dbtBadge: "SBI સીધું બેંક ટ્રાન્સફર સક્રિય",
      tab1: "ખરીદી સ્લોટ અને ટોકન",
      tab2: "📍 નજીકના ખરીદી કેન્દ્રો",
      tab3: "લાઈવ કતાર અને સમય",
      tab4: "ખરીદી રસીદ અને ચૂકવણી",
      bookingTitle: "ખરીદી સ્લોટ અને ડિજિટલ ટોકન બુકિંગ",
      bookingSubtitle: "માર્કેટમાં લાઈનમાં ઊભા રહ્યા વિના ડિજિટલ સ્લોટ બુક કરો.",
      cropLabel: "ખરીદી માટે પાક",
      cropOptPaddy: "ડાંગર ગ્રેડ-એ - ₹2,300 / ક્વિન્ટલ",
      cropOptWheat: "ઘઉં FAQ - ₹2,275 / ક્વિન્ટલ",
      cropOptMaize: "મકાઈ હાઇબ્રિડ - ₹2,090 / ક્વિન્ટલ",
      cropOptChana: "ચણા - ₹5,440 / ક્વિન્ટલ",
      cropOptMustard: "રાયડો - ₹5,650 / ક્વિન્ટલ",
      qtyLabel: "અંદાજિત વજન (ક્વિન્ટલ)",
      qtyPlaceholder: "દા.ત. 50",
      hubLabel: "ખરીદી કેન્દ્ર / માર્કેટ યાર્ડ",
      hubOpt1: "PC-101: કરનાલ સેન્ટ્રલ ખરીદી કેન્દ્ર",
      hubOpt2: "PC-102: ઘરોંડા માર્કેટ સેન્ટર",
      hubOpt3: "PC-103: તરાવડી અનાજ બજાર",
      slotLabel: "પહોંચવાનો સમય સ્લોટ",
      slotOpt1: "આજે 09:00 AM - 10:00 AM (8 સ્લોટ બાકી)",
      slotOpt2: "આજે 10:00 AM - 11:00 AM (14 સ્લોટ બાકી)",
      slotOpt3: "આજે 11:00 AM - 12:00 PM (4 સ્લોટ બાકી)",
      slotOpt4: "આજે 02:00 PM - 03:00 PM (18 સ્લોટ બાકી)",
      vehicleLabel: "વાહન / ટ્રોલી નંબર",
      phoneLabel: "ખેડૂત મોબાઈલ નંબર",
      bookBtn: "સ્લોટ બુક કરો અને ટોકન મેળવો",
      calcTitle: "અંદાજિત સરકારી MSP રકમ",
      calcSubtitle: "સીધા બેંક ખાતામાં ટ્રાન્સફર (DBT) અંદાજ.",
      mspRateLabel: "સરકારી MSP દર:",
      moistureNormLabel: "ભેજ મર્યાદા:",
      moistureNormVal: "≤ 14.0% (ગ્રેડ એ ધોરણ)",
      foreignMatterLabel: "કચરો મર્યાદા:",
      foreignMatterVal: "≤ 1.0% માન્ય",
      totalPayoutLabel: "કુલ DBT ચૂકવણી:",
      instructionTitle: "ખરીદી માર્ગદર્શિકા:",
      instruction1: "1. બુક કરેલા સમય પર કેન્દ્રના ગેટ પર પહોંચો.",
      instruction2: "2. કાઉન્ટર 2 પર ડિજિટલ ભેજ પરીક્ષણ કરાવો.",
      instruction3: "3. ઇલેક્ટ્રોનિક વજન કાંટા પર વજન કરાવી ડિજિટલ રસીદ મેળવો.",
      ticketCardTitle: "તમારું ડિજિટલ કતાર ટોકન",
      ticketCardSubtitle: "સ્માર્ટ AI લાઈવ કતાર ટ્રેકર.",
      ticketHeader: "🏛️ કરનાલ સેન્ટ્રલ ખરીદી કેન્દ્ર • લેન 2",
      assignedLane: "કાઉન્ટર: કાઉન્ટર 2 (Moisture Lab)",
      currServing: "હાલનું ટોકન",
      estTime: "રાહ જોવાનો સમય",
      aheadCount: "આગળ ખેડૂતો",
      aheadVal: "3 ખેડૂતો",
      step1: "સ્લોટ બુક",
      step2: "ગેટ એન્ટ્રી",
      step3: "ભેજ ચકાસણી",
      step4: "વજન કાંટો",
      step5: "બેંક ચૂકવણી",
      voiceNotice: "📢 તમારું ટોકન બોલાવવામાં આવે ત્યારે સ્પીકર અને SMS પર અવાજ સંભળાશે.",
      qualityTitle: "ગુણવત્તા અને વજન માહિતી",
      qualitySubtitle: "ડિજિટલ ભેજ મીટર અને વજન કાંટો ડેટા.",
      moistureTestLabel: "ભેજ ચકાસણી:",
      gradePassBadge: "11.8% (ગ્રેડ-એ પાસ)",
      moistureDesc: "ભેજ 14% થી ઓછો છે. પૂરો MSP ભાવ મળશે. શૂન્ય કપાત.",
      weighmentLabel: "ઇલેક્ટ્રોનિક વજન કાંટો:",
      weighmentDesc: "કુલ: 58.20 Qtl • ચોખ્ખું: 50.00 Qtl",
      dbtAmountLabel: "DBT ચૂકવણી રકમ:",
      dbtTransferDesc: "PFMS દ્વારા સ્ટેટ બેંક ઓફ ઇન્ડિયા ખાતામાં (...5019) જમા કરવામાં આવી રહી છે.",
      recordsTitle: "ખરીદી રસીદો અને બેંક ખાતા વિગતો",
      recordsSubtitle: "પ્રમાણિત સરકારી રસીદો અને ટ્રાન્ઝેક્શન લોગ.",
      voiceOn: "અવાજ: ચાલુ",
      voiceOff: "અવાજ: બંધ",
      gpsBannerTitle: "ખેતરનું સ્થાન અને નજીકના ખરીદી કેન્દ્રો",
      gpsBannerSubtitle: "લાઈવ જીપીએસ અંતર મુજબ નજીકની મંડીઓ શોધો.",
      btnGpsDetect: "સ્થાન શોધો (GPS Detect)",
      nearestMandiTitle: "તમારી નજીકના ખરીદી કેન્દ્રો",
      nearestMandiSub: "સ્લોટ બુક કરવા માટે કેન્દ્ર પસંદ કરો.",
      selectMandiBtn: "આ કેન્દ્ર પસંદ કરો",
      nearestBadgeText: "સૌથી નજીક (ઝડપી)",
      loginTitle: "ખેડૂત લૉગિન (Farmer Sign In)",
      loginSubtitle: "સ્લોટ બુકિંગ અને DBT ચૂકવણી માટે લૉગિન કરો.",
      loginUserLabel: "મોબાઈલ નંબર અથવા ખેડૂત ID",
      loginPinLabel: "સુરક્ષા પિન / પાસવર્ડ",
      loginBtn: "લૉગિન કરો (SIGN IN)",
      demoTitle: "⚡ ડેમો ખેડૂત પ્રોફાઇલ (Demo Logins)",
      noAccountText: "ખાતું નથી?",
      registerLinkText: "નવા ખેડૂત નોંધણી કરો",
      signupTitle: "નવી ખેડૂત નોંધણી (Registration)",
      signupSubtitle: "સરકારી MSP ખરીદી માટે નોંધણી કરો.",
      signupNameLabel: "પૂરું નામ",
      signupMobileLabel: "મોબાઈલ નંબર",
      signupAadhaarLabel: "આધાર નંબર",
      signupLandLabel: "જમીન (એકર)",
      signupVillageLabel: "ગામ અને જિલ્લો",
      gpsFieldLabel: "GPS સ્થાન",
      bankAccLabel: "બેંક ખાતા નંબર",
      ifscLabel: "IFSC કોડ",
      createPinLabel: "નવો પિન બનાવો",
      govVerificationNote: "સરકારી ડેટાબેઝ સાથે આપમેળે ચકાસણી.",
      completeSignupBtn: "નોંધણી પૂર્ણ કરો",
      alreadyAccountText: "પહેલેથી નોંધાયેલા છો?",
      loginLinkText: "અહીં લૉગિન કરો",
      logoutText: "લૉગઆઉટ"
    }
  };

  // 1. Authentication State Manager
  function getLoggedInUser() {
    const raw = localStorage.getItem("kisan_auth_user");
    return raw ? JSON.parse(raw) : DEMO_FARMERS.ramesh;
  }

  function setLoggedInUser(user) {
    localStorage.setItem("kisan_auth_user", JSON.stringify(user));
  }

  function logoutUser() {
    localStorage.removeItem("kisan_auth_user");
    window.location.href = "login.html";
  }

  // 2. Load Prompts Dictionary
  async function loadPrompts() {
    try {
      const res = await fetch("farmer_prompts.json");
      if (res.ok) {
        prompts = await res.json();
      }
    } catch (e) {
      console.warn("Using offline voice packs", e);
    }
  }

  function getSelectedLang() {
    const saved = localStorage.getItem("kisan_preferred_lang");
    if (saved && UI_TEXT[saved]) return saved;
    const sel = document.getElementById("kisan-lang-select");
    if (sel && sel.value && UI_TEXT[sel.value]) return sel.value;
    return "hi";
  }

  // Play audio file from local MP3 voice packs
  function playAudioFile(src) {
    return new Promise((resolve, reject) => {
      if (!voiceEnabled) {
        resolve();
        return;
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      currentAudio = new Audio(src);
      currentAudio.onended = () => resolve();
      currentAudio.onerror = (err) => reject(err);
      const p = currentAudio.play();
      if (p !== undefined) {
        p.then(resolve).catch(reject);
      }
    });
  }

  // Speak fallback text
  function speakText(text, lang = "hi") {
    if (!voiceEnabled) return;

    const langGreeting = `voice-audio/greet_${lang}.mp3`;
    playAudioFile(langGreeting).catch(() => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "en" ? "en-IN" : (lang === "hi" ? "hi-IN" : `${lang}-IN`);
        utterance.rate = 0.92;
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v => v.lang.toLowerCase().startsWith(lang));
        if (match) utterance.voice = match;
        window.speechSynthesis.speak(utterance);
      }
    });
  }

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    } catch (e) {}
  }

  // Play field prompts using pre-recorded local MP3 voice packs
  async function playPrompt(key, btn) {
    if (!voiceEnabled) return;
    const lang = getSelectedLang();

    if (btn) {
      btn.classList.add("speaking");
      setTimeout(() => btn.classList.remove("speaking"), 2800);
    }

    const audioKey = key.replace(".", "_");
    const localMp3Path = `voice-audio/${audioKey}_${lang}.mp3`;

    try {
      await playAudioFile(localMp3Path);
    } catch (e) {
      let text = (prompts[key] && prompts[key][lang]) || "Voice guidance";
      speakText(text, lang);
    }
  }

  // 3. Haversine Distance Engine for Geolocation
  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function renderNearestMandis() {
    const container = document.getElementById("nearest-mandis-container");
    if (!container) return;

    const lang = getSelectedLang();
    const dict = UI_TEXT[lang] || UI_TEXT.en;

    // Calculate distance for all centres and sort
    const scoredCentres = PROCUREMENT_CENTRES.map(c => {
      const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, c.lat, c.lng);
      const estTimeMins = Math.round(dist * 2.5 + 4);
      return { ...c, distanceKm: dist, estTimeMins };
    }).sort((a, b) => a.distanceKm - b.distanceKm);

    container.innerHTML = scoredCentres.map((c, index) => {
      const isNearest = index === 0;
      return `
        <div class="mandi-card ${isNearest ? 'nearest-recommend' : ''}">
          ${isNearest ? `<div class="nearest-badge-ribbon">${dict.nearestBadgeText || "Closest Centre (Fastest)"}</div>` : ''}
          
          <div>
            <div class="mandi-header">
              <div class="mandi-icon-box">
                <span class="material-symbols-outlined" style="font-size: 1.4rem;">hub</span>
              </div>
              <div>
                <div class="mandi-name">${c.name}</div>
                <div class="mandi-location-text">
                  <span class="material-symbols-outlined" style="font-size: 0.95rem; color: var(--color-primary);">location_on</span>
                  <span>${c.district}</span>
                </div>
              </div>
            </div>

            <div class="distance-pill">
              <span class="material-symbols-outlined" style="font-size: 1rem;">directions_car</span>
              <span>${c.distanceKm.toFixed(1)} km away • ~${c.estTimeMins} mins</span>
            </div>

            <div class="mandi-metrics-row">
              <div class="metric-item">
                <span class="metric-label">Live Queue Load</span>
                <span class="metric-value" style="color: ${isNearest ? 'var(--color-primary-dark)' : 'var(--text-main)'};">${c.activeQueue}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Moisture Lab</span>
                <span class="metric-value">${c.moistureLab.split('(')[0]}</span>
              </div>
              <div class="metric-item" style="margin-top: 0.35rem;">
                <span class="metric-label">Weighbridges</span>
                <span class="metric-value">${c.weighbridges}</span>
              </div>
              <div class="metric-item" style="margin-top: 0.35rem;">
                <span class="metric-label">Daily Capacity</span>
                <span class="metric-value">${c.dailyCapacity}</span>
              </div>
            </div>
          </div>

          <button type="button" class="btn-select-mandi" data-select-hub="${c.name}">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">check_circle</span>
            <span>${dict.selectMandiBtn || "Select This Hub & Book Slot"}</span>
          </button>
        </div>
      `;
    }).join("");

    // Attach click listeners to "Select Centre" buttons
    container.querySelectorAll("[data-select-hub]").forEach(btn => {
      btn.addEventListener("click", () => {
        const hubName = btn.dataset.selectHub;
        
        // 1. Set hub in procurement booking select dropdown
        const hubSelect = document.getElementById("proc-hub-select");
        if (hubSelect) {
          let found = false;
          for (let i = 0; i < hubSelect.options.length; i++) {
            if (hubSelect.options[i].value.toLowerCase().includes(hubName.toLowerCase()) || hubName.toLowerCase().includes(hubSelect.options[i].value.toLowerCase())) {
              hubSelect.selectedIndex = i;
              found = true;
              break;
            }
          }
          if (!found) {
            const opt = new Option(hubName, hubName, true, true);
            hubSelect.add(opt);
          }
        }

        // 2. Switch to Tab 1 (Procurement Slot Booking)
        const tab1Btn = document.querySelector('[data-target="tab-proc-booking"]');
        if (tab1Btn) tab1Btn.click();

        playChime();
        alert(`✓ Selected Hub: ${hubName}\nRedirected to Slot Booking tab!`);
      });
    });
  }

  // Dynamic MSP Payout Calculation
  function updatePayout() {
    const calcWeight = document.getElementById("proc-qty-input");
    const calcCrop = document.getElementById("proc-crop-select");
    const outRate = document.getElementById("calc-rate-display");
    const outTotal = document.getElementById("calc-total-display");

    if (!calcWeight || !calcCrop) return;
    const weight = parseFloat(calcWeight.value) || 0;
    const cropKey = calcCrop.value || "paddy_a";
    const cropInfo = CROPS_MSP[cropKey] || CROPS_MSP.paddy_a;

    const total = weight * cropInfo.msp;
    if (outRate) outRate.innerText = `₹${cropInfo.msp.toLocaleString("en-IN")} / Quintal`;
    if (outTotal) outTotal.innerText = `₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }

  // 4. Instant Full UI Translation Engine
  function applyLanguage(lang) {
    if (!lang || !UI_TEXT[lang]) {
      lang = getSelectedLang();
    }
    localStorage.setItem("kisan_preferred_lang", lang);

    const langSelect = document.getElementById("kisan-lang-select");
    if (langSelect && langSelect.value !== lang) {
      langSelect.value = lang;
    }

    const dict = UI_TEXT[lang] || UI_TEXT.en;

    // Update all elements with data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          el.placeholder = dict[key];
        } else {
          el.innerText = dict[key];
        }
      }
    });

    // Update select options for procurement crop dropdown
    const cropSelect = document.getElementById("proc-crop-select");
    if (cropSelect && dict.cropOptPaddy) {
      const crops = [
        { val: "paddy_a", text: dict.cropOptPaddy },
        { val: "wheat", text: dict.cropOptWheat },
        { val: "maize", text: dict.cropOptMaize },
        { val: "chana", text: dict.cropOptChana },
        { val: "mustard", text: dict.cropOptMustard }
      ];
      const cur = cropSelect.value;
      cropSelect.innerHTML = crops.map(c => `<option value="${c.val}" ${c.val === cur ? "selected" : ""}>${c.text}</option>`).join("");
    }

    // Update select options for signup crop dropdown if present
    const signupCropSelect = document.getElementById("signup-crop");
    if (signupCropSelect) {
      const crops = [
        { val: "paddy_a", text: getCropName("paddy_a", lang) },
        { val: "wheat", text: getCropName("wheat", lang) },
        { val: "maize", text: getCropName("maize", lang) },
        { val: "chana", text: getCropName("chana", lang) },
        { val: "mustard", text: getCropName("mustard", lang) }
      ];
      const cur = signupCropSelect.value;
      signupCropSelect.innerHTML = crops.map(c => `<option value="${c.val}" ${c.val === cur ? "selected" : ""}>${c.text}</option>`).join("");
    }

    const hubSelect = document.getElementById("proc-hub-select");
    if (hubSelect && dict.hubOpt1) {
      const hubs = [
        { val: "Karnal Central Procurement Hub", text: dict.hubOpt1 },
        { val: "Gharaunda Agri Mandi Centre", text: dict.hubOpt2 },
        { val: "Taraori Grain Market Hub", text: dict.hubOpt3 }
      ];
      const cur = hubSelect.value;
      hubSelect.innerHTML = hubs.map(h => `<option value="${h.val}" ${h.val === cur ? "selected" : ""}>${h.text}</option>`).join("");
    }

    const slotSelect = document.getElementById("proc-slot-select");
    if (slotSelect && dict.slotOpt1) {
      const slots = [
        { val: "Today 09:00 AM - 10:00 AM", text: dict.slotOpt1 },
        { val: "Today 10:00 AM - 11:00 AM", text: dict.slotOpt2 },
        { val: "Today 11:00 AM - 12:00 PM", text: dict.slotOpt3 },
        { val: "Today 02:00 PM - 03:00 PM", text: dict.slotOpt4 }
      ];
      const cur = slotSelect.value;
      slotSelect.innerHTML = slots.map(s => `<option value="${s.val}" ${s.val === cur ? "selected" : ""}>${s.text}</option>`).join("");
    }

    // Update master voice toggle button text
    const masterVoiceBtn = document.getElementById("master-voice-toggle");
    if (masterVoiceBtn) {
      const label = voiceEnabled ? (dict.voiceOn || "Voice: ON") : (dict.voiceOff || "Voice: OFF");
      masterVoiceBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 1.15rem;">${voiceEnabled ? "volume_up" : "volume_off"}</span> <span>${label}</span>`;
    }

    // Re-render Procurement Batches with updated localized crop names
    renderProcurementList();

    // Re-render Nearest Mandis cards with active language
    renderNearestMandis();

    // Update MSP calculation box
    updatePayout();

    // Play greeting audio file for selected language
    playAudioFile(`voice-audio/greet_${lang}.mp3`).catch(() => {});
  }

  // 5. Default Seed Procurement Batches
  const DEFAULT_PROC_BATCHES = [
    {
      id: "PROC-2026-9041",
      token: "TK-1042",
      cropKey: "paddy_a",
      crop: "Paddy Grade A",
      qty: 50.0,
      centre: "Karnal Central Procurement Hub",
      slot: "Today 10:00 AM - 11:00 AM",
      status: "In Queue (Weighment Pending)",
      moisture: "11.8% (Grade A)",
      rate: 2300,
      total: 115000,
      dbtStatus: "Approved by Officer",
      step: 3
    },
    {
      id: "PROC-2026-8812",
      token: "TK-0988",
      cropKey: "wheat",
      crop: "Wheat FAQ",
      qty: 60.0,
      centre: "Gharaunda Mandi Centre",
      slot: "Yesterday 02:00 PM",
      status: "Procured & Paid",
      moisture: "10.4% (Grade A)",
      rate: 2275,
      total: 136500,
      dbtStatus: "Disbursed (UTR-2026-SBIN-882910)",
      step: 5
    }
  ];

  function getStoredBatches() {
    const raw = localStorage.getItem("kisan_procurement_batches");
    return raw ? JSON.parse(raw) : DEFAULT_PROC_BATCHES;
  }

  function saveBatches(batches) {
    localStorage.setItem("kisan_procurement_batches", JSON.stringify(batches));
    renderProcurementList();
  }

  function renderProcurementList() {
    const container = document.getElementById("procurement-list-container");
    if (!container) return;

    const lang = getSelectedLang();
    const batches = getStoredBatches();
    if (batches.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2.5rem; color: #64748b; font-size: 0.88rem;">No active procurement records found. Use the slot booking form to register your harvest for procurement.</div>`;
      return;
    }

    container.innerHTML = batches.map(b => {
      const localizedCrop = getCropName(b.cropKey || b.crop, lang);
      return `
      <div class="clean-crop-card">
        <div class="crop-card-main">
          <div class="crop-icon-box">
            <span class="material-symbols-outlined" style="font-size: 1.6rem;">receipt_long</span>
          </div>
          <div class="crop-title-text" style="flex: 1;">
            <div>
              <strong style="color: var(--text-main); font-size: 1rem;">${localizedCrop}</strong> 
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-primary-dark); margin-left: 0.4rem;">[${b.token}]</span>
            </div>
            <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.25rem;">
              <span>Hub: <strong>${b.centre}</strong></span> • <span>Weight: <strong>${b.qty} Qtl</strong></span> • <span>MSP: <strong>₹${b.rate.toLocaleString("en-IN")}/q</strong></span>
            </div>
          </div>
          <div class="crop-card-right">
            <span class="crop-badge-status">${b.status}</span>
            <div style="font-size: 0.95rem; font-weight: 800; font-family: var(--font-mono); color: var(--color-primary-dark); margin-top: 0.35rem;">
              ₹${b.total.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div class="card-timeline-box">
          <div class="timeline-step ${b.step >= 1 ? 'done' : ''}">1. Slot</div>
          <div class="timeline-step ${b.step >= 2 ? 'done' : ''}">2. Gate</div>
          <div class="timeline-step ${b.step >= 3 ? 'done' : ''}">3. Moisture</div>
          <div class="timeline-step ${b.step >= 4 ? 'done' : ''}">4. Weight</div>
          <div class="timeline-step ${b.step >= 5 ? 'done' : ''}">5. DBT Paid</div>
        </div>

        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #64748b;">
          <span>Moisture: <strong>${b.moisture}</strong></span>
          <span style="color: #16a34a; font-weight: 700;">✓ ${b.dbtStatus}</span>
        </div>
      </div>
    `;
    }).join("");
  }

  // 6. Application Initializer
  async function init() {
    await loadPrompts();

    const currentLang = getSelectedLang();

    // Language Dropdown Change Listener & Initial Value Sync
    const langSelect = document.getElementById("kisan-lang-select");
    if (langSelect) {
      langSelect.value = currentLang;
      langSelect.addEventListener("change", () => {
        const lang = langSelect.value;
        localStorage.setItem("kisan_preferred_lang", lang);
        applyLanguage(lang);
      });
    }

    const currentUser = getLoggedInUser();

    // Populate user profile info in dashboard
    const nameEl = document.querySelector('[data-i18n="farmerName"]');
    if (nameEl && currentUser.name) nameEl.innerText = currentUser.name;

    const landEl = document.querySelector('[data-i18n="landVal"]');
    if (landEl && currentUser.land) landEl.innerText = currentUser.land;

    const villageEl = document.querySelector('[data-i18n="village"]');
    if (villageEl && currentUser.village) villageEl.innerText = `गाँव: ${currentUser.village}`;

    const dbtEl = document.querySelector('[data-i18n="dbtBadge"]');
    if (dbtEl && currentUser.bank) dbtEl.innerText = `${currentUser.bank} Active DBT`;

    // Render lists
    renderProcurementList();
    renderNearestMandis();

    // Tab Navigation
    const tabButtons = document.querySelectorAll(".portal-tab-btn");
    const tabViews = document.querySelectorAll(".tab-view");

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        tabButtons.forEach(b => b.classList.remove("active"));
        tabViews.forEach(v => v.classList.remove("active"));
        btn.classList.add("active");
        const activeView = document.getElementById(target);
        if (activeView) activeView.classList.add("active");
      });
    });

    // Master Voice Toggle
    const masterVoiceBtn = document.getElementById("master-voice-toggle");
    if (masterVoiceBtn) {
      masterVoiceBtn.addEventListener("click", () => {
        voiceEnabled = !voiceEnabled;
        masterVoiceBtn.classList.toggle("active-voice", voiceEnabled);
        const lang = getSelectedLang();
        const dict = UI_TEXT[lang] || UI_TEXT.en;
        const label = voiceEnabled ? (dict.voiceOn || "Voice: ON") : (dict.voiceOff || "Voice: OFF");
        masterVoiceBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 1.15rem;">${voiceEnabled ? "volume_up" : "volume_off"}</span> <span>${label}</span>`;
      });
    }

    // Attach Voice Buttons for Field Prompts
    document.querySelectorAll("[data-voice-key]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (btn.tagName === "BUTTON") e.preventDefault();
        const key = btn.dataset.voiceKey;
        playPrompt(key, btn);
      });
    });

    // Interactive Voice Guidance when Farmer Focuses or Clicks on any Input Field
    let lastVoiceSpokenTime = 0;
    document.querySelectorAll("input[data-voice-key], select[data-voice-key], textarea[data-voice-key]").forEach(input => {
      input.addEventListener("focus", () => {
        const now = Date.now();
        if (now - lastVoiceSpokenTime < 1800) return; // Prevent rapid overlapping speech
        lastVoiceSpokenTime = now;
        const key = input.dataset.voiceKey;
        if (key && voiceEnabled) {
          playPrompt(key);
        }
      });
    });

    // Auto-Welcome spoken guidance when Login page loads
    if (document.getElementById("kisan-login-form")) {
      setTimeout(() => {
        if (voiceEnabled) {
          const lang = getSelectedLang();
          playAudioFile(`voice-audio/auth_loginWelcome_${lang}.mp3`).catch(() => {});
        }
      }, 700);
    }

    // Geolocation Detection Button
    const btnGpsDetect = document.getElementById("btn-gps-detect");
    const gpsCoordsDisplay = document.getElementById("gps-coords-display");
    const gpsRadar = document.querySelector(".gps-radar-icon");

    if (btnGpsDetect) {
      btnGpsDetect.addEventListener("click", () => {
        if (gpsRadar) gpsRadar.classList.add("detecting");
        if (gpsCoordsDisplay) gpsCoordsDisplay.innerText = "Acquiring satellite GPS fix...";

        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (gpsRadar) gpsRadar.classList.remove("detecting");
              userCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              };
              if (gpsCoordsDisplay) {
                gpsCoordsDisplay.innerText = `GPS Fix: ${userCoords.lat.toFixed(4)}° N, ${userCoords.lng.toFixed(4)}° E (±${Math.round(pos.coords.accuracy || 15)}m)`;
              }
              playChime();
              renderNearestMandis();
            },
            (err) => {
              if (gpsRadar) gpsRadar.classList.remove("detecting");
              // Fallback to Karnal/User's registered farm coords
              userCoords = currentUser.lat ? { lat: currentUser.lat, lng: currentUser.lng } : { lat: 29.6857, lng: 76.9905 };
              if (gpsCoordsDisplay) {
                gpsCoordsDisplay.innerText = `Farm Location: ${userCoords.lat.toFixed(4)}° N, ${userCoords.lng.toFixed(4)}° E (Registered Field)`;
              }
              renderNearestMandis();
            },
            { timeout: 8000, enableHighAccuracy: true }
          );
        } else {
          if (gpsRadar) gpsRadar.classList.remove("detecting");
          renderNearestMandis();
        }
      });
    }

    // Signup Farm GPS Button
    const btnSignupGps = document.getElementById("btn-signup-gps");
    const signupCoordsInput = document.getElementById("signup-coordinates");
    if (btnSignupGps && signupCoordsInput) {
      btnSignupGps.addEventListener("click", () => {
        signupCoordsInput.value = "Acquiring GPS fix...";
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              signupCoordsInput.value = `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`;
              playChime();
            },
            () => {
              signupCoordsInput.value = "29.6857° N, 76.9905° E (Auto-assigned)";
            }
          );
        } else {
          signupCoordsInput.value = "29.6857° N, 76.9905° E (Auto-assigned)";
        }
      });
    }

    // 7. Login Form Handler
    const loginForm = document.getElementById("kisan-login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const identifier = document.getElementById("login-identifier").value.trim();
        
        // Find if matches demo or stored
        let matchedUser = DEMO_FARMERS.ramesh;
        if (identifier.includes("9044") || identifier.includes("sukhwinder") || identifier.includes("3210")) {
          matchedUser = DEMO_FARMERS.sukhwinder;
        } else if (identifier.includes("7731") || identifier.includes("venkat") || identifier.includes("3211")) {
          matchedUser = DEMO_FARMERS.venkat;
        } else if (localStorage.getItem(`kisan_user_${identifier}`)) {
          matchedUser = JSON.parse(localStorage.getItem(`kisan_user_${identifier}`));
        }

        setLoggedInUser(matchedUser);
        playChime();
        alert(`✓ Welcome back, ${matchedUser.name}!\nLogged in successfully.`);
        window.location.href = "farmer_dashboard.html";
      });

      // Quick Demo 1-Click Login Chips
      document.querySelectorAll("[data-demo-farmer]").forEach(btn => {
        btn.addEventListener("click", () => {
          const key = btn.dataset.demoFarmer;
          const user = DEMO_FARMERS[key] || DEMO_FARMERS.ramesh;
          setLoggedInUser(user);
          playChime();
          alert(`✓ Loaded Demo Profile: ${user.name} (${user.village})`);
          window.location.href = "farmer_dashboard.html";
        });
      });
    }

    // 8. Signup Form Handler
    const signupForm = document.getElementById("kisan-signup-form");
    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("signup-name").value.trim();
        const mobile = document.getElementById("signup-mobile").value.trim();
        const aadhaar = document.getElementById("signup-aadhaar").value.trim();
        const land = document.getElementById("signup-land").value.trim();
        const village = document.getElementById("signup-village").value.trim();
        const bankAcc = document.getElementById("signup-bank-acc").value.trim();
        const crop = document.getElementById("signup-crop").value;

        const newFarmer = {
          name: name,
          id: `FAR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: mobile,
          village: village,
          land: `${land} Acres`,
          aadhaar: aadhaar,
          bank: `DBT A/c ...${bankAcc.slice(-4) || '5019'}`,
          crop: crop,
          lat: 29.6857,
          lng: 76.9905
        };

        setLoggedInUser(newFarmer);
        localStorage.setItem(`kisan_user_${mobile}`, JSON.stringify(newFarmer));

        playChime();
        alert(`✓ Congratulations ${name}!\nYour Farmer KYC has been registered and verified successfully.\nFarmer ID: ${newFarmer.id}`);
        window.location.href = "farmer_dashboard.html";
      });
    }

    // 9. Logout Button Handler
    const logoutBtn = document.getElementById("btn-logout-header");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        logoutUser();
      });
    }

    // 10. Procurement Slot Booking Form
    const procBookingForm = document.getElementById("kisan-procurement-form");
    if (procBookingForm) {
      procBookingForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const cropKey = document.getElementById("proc-crop-select").value;
        const cropInfo = CROPS_MSP[cropKey] || CROPS_MSP.paddy_a;
        const qty = parseFloat(document.getElementById("proc-qty-input").value) || 50.0;
        const hub = document.getElementById("proc-hub-select").value;
        const slot = document.getElementById("proc-slot-select").value;

        const tokenNum = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
        const totalPayout = qty * cropInfo.msp;

        const newRecord = {
          id: `PROC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          token: tokenNum,
          cropKey: cropKey,
          crop: cropInfo.name,
          qty: qty,
          centre: hub,
          slot: slot,
          vehicleNo: ((document.getElementById("proc-vehicle-input") || {}).value || "").replace(/\s*\([^)]*\)\s*$/, "").trim(),
          status: "Slot Confirmed (Gate Ready)",
          moisture: "Pending Test (≤14.0% Required)",
          rate: cropInfo.msp,
          total: totalPayout,
          dbtStatus: "DBT Direct Bank Route Active",
          step: 1
        };

        const current = getStoredBatches();
        current.unshift(newRecord);
        saveBatches(current);

        // Update live token display card
        const display = document.getElementById("active-token-hero");
        const ticket = document.getElementById("live-ticket-card");
        if (display) display.innerText = tokenNum;
        if (ticket) ticket.style.display = "block";

        playChime();

        const lang = getSelectedLang();
        playAudioFile(`voice-audio/token_booked_${lang}.mp3`).catch(() => {
          speakText(`Token ${tokenNum} generated.`, lang);
        });

        alert(`✓ Procurement Token ${tokenNum} generated successfully!\n• Hub: ${hub}\n• Expected MSP Amount: ₹${totalPayout.toLocaleString("en-IN")}`);
      });
    }

    // Hook up calculation listeners
    const calcWeight = document.getElementById("proc-qty-input");
    const calcCrop = document.getElementById("proc-crop-select");
    if (calcWeight) calcWeight.addEventListener("input", updatePayout);
    if (calcCrop) calcCrop.addEventListener("change", updatePayout);

    // Initial language application to sync everything on load
    applyLanguage(currentLang);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
