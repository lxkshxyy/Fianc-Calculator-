import type { Dictionary } from './en'

/**
 * Hindi.
 *
 * A `Dictionary` — every key optional — on purpose: a key left out falls back to English at
 * render time. That is the difference between a half-translated app that works
 * and one that shows `nav.income` to a customer. Adding a line here is all it
 * takes to translate one more string — nothing else has to change.
 *
 * Conventions used throughout:
 * · Money words stay the ones people actually use in India — EMI, क्रेडिट स्कोर,
 *   लाख, करोड़ — rather than Sanskritised coinages nobody says out loud.
 * · Amounts, dates and numerals are never translated. They are the user's own
 *   figures, and `Intl.NumberFormat('en-IN')` already renders them correctly.
 */
export const hi: Dictionary = {
  /* ── Navigation ──────────────────────────────────────────────────────── */
  'nav.main': 'मुख्य',
  'nav.money': 'पैसा',
  'nav.wealth': 'संपत्ति',
  'nav.growth': 'विकास',
  'nav.tools': 'सुविधाएँ',
  'nav.more': 'और',

  'nav.dashboard': 'डैशबोर्ड',
  'nav.income': 'आमदनी',
  'nav.income-opportunities': 'कमाई के अवसर',
  'nav.budget': 'बजट',
  'nav.emi-credit': 'EMI और क्रेडिट',
  'nav.tax': 'टैक्स योजना',
  'nav.investments': 'निवेश',
  'nav.goals': 'लक्ष्य',
  'nav.assets': 'संपत्तियाँ',
  'nav.insurance': 'बीमा',
  'nav.learning': 'मेरी सीख',
  'nav.morning-club': 'मॉर्निंग क्लब',
  'nav.achievements': 'उपलब्धियाँ',
  'nav.referrals': 'रेफर करें और कमाएँ',
  'nav.assistant': 'AI सहायक',
  'nav.documents': 'दस्तावेज़',
  'nav.expert-chat': 'विशेषज्ञ से बात',
  'nav.request-centre': 'रिक्वेस्ट सेंटर',
  'nav.family': 'परिवार',
  'nav.settings': 'सेटिंग्स',
  'nav.onboarding': 'शुरुआत',
  'nav.upgrade': 'अपग्रेड',

  /* ── Sticky header ───────────────────────────────────────────────────── */
  'header.greeting': 'आपका फिर से स्वागत है',
  /* Name first — which is where Hindi wants it, and the reason `{name}` is a
     placeholder rather than a fragment glued onto the end of a string. */
  'header.greetingNamed': '{name}, आपका फिर से स्वागत है',
  'header.greetingSubtitle': 'आज आपके पैसे की स्थिति यह है।',
  'header.groupSubtitle': 'आपके {group} से जुड़ी हर चीज़',
  'header.openMore': 'और',
  'header.leavesApp': '(ऐप से बाहर ले जाता है)',

  /* ── More sheet ──────────────────────────────────────────────────────── */
  'more.title': 'और',
  'more.description': 'सुविधाएँ और सेटिंग्स',
  'more.theme': 'थीम',
  'more.signOut': 'साइन आउट',

  /* ── Common actions ──────────────────────────────────────────────────── */
  'action.add': 'जोड़ें',
  'action.save': 'सेव करें',
  'action.cancel': 'रद्द करें',
  'action.saving': 'सेव हो रहा है…',
  'action.close': 'बंद करें',
  'action.details': 'विवरण →',
  'action.done': 'हो गया',
  'action.edit': 'बदलें',
  'action.reset': 'रीसेट',

  /* ── Dashboard ───────────────────────────────────────────────────────── */
  'dashboard.netWorth': 'कुल संपत्ति',
  'dashboard.journey': 'आपका सफ़र',
  'dashboard.health': 'सेहत और प्रगति',
  'dashboard.metrics': 'मुख्य आँकड़े',
  'dashboard.edit': 'डैशबोर्ड बदलें',
  'dashboard.editDone': 'हो गया',
  'dashboard.resetLayout': 'पुराना क्रम वापस लाएँ',
  'dashboard.arrange': 'अपना डैशबोर्ड सजाएँ',
  'dashboard.moveUpOf': '{section} को ऊपर ले जाएँ',
  'dashboard.moveDownOf': '{section} को नीचे ले जाएँ',
  'dashboard.hideOf': '{section} छुपाएँ',
  'dashboard.showOf': '{section} दिखाएँ',
  'dashboard.moveUp': 'ऊपर ले जाएँ',
  'dashboard.moveDown': 'नीचे ले जाएँ',
  'dashboard.hide': 'छुपाएँ',
  'dashboard.show': 'दिखाएँ',
  'netWorth.title': 'कुल संपत्ति',
  'netWorth.caption': 'आपके पास जो है, उसमें से जो आप पर बकाया है वह घटाकर',
  'netWorth.assets': 'संपत्तियाँ',
  'netWorth.liabilities': 'देनदारियाँ',

  /* ── Screen headings ─────────────────────────────────────────────────── */
  'screen.income.subtitle':
    'आने वाला हर रुपया, महीने के हिसाब से — ताकि सारे आँकड़ों की तुलना हो सके।',
  'screen.emi-credit.subtitle':
    'आप पर क्या बकाया है, वह आपको कितना महँगा पड़ रहा है, और जल्दी चुकाने से क्या बचेगा।',
  'screen.settings.subtitle': 'आपकी प्रोफ़ाइल, ऐप कैसा दिखे, और आपके डेटा का क्या होता है।',

  /* ── Income screen ───────────────────────────────────────────────────── */
  'income.monthlyTotal': 'महीने की कुल आमदनी',
  'income.activeSources': 'चालू स्रोत',
  'income.annualised': 'सालाना',
  'income.sources': 'स्रोत',
  'income.add': 'आमदनी जोड़ें',
  'income.addTitle': 'आमदनी का स्रोत जोड़ें',
  'income.addDescription': 'जिससे भी आपको पैसा मिलता है — सैलरी, फ्रीलांस काम, किराया, ब्याज।',
  'income.save': 'स्रोत सेव करें',
  'income.emptyTitle': 'कोई आमदनी दर्ज नहीं है',
  'income.emptyBody':
    'सैलरी या कोई साइड इनकम जोड़ें — बचत दर, टैक्स अनुमान और आपका स्तर, सब चलने लगेंगे।',
  'cadence.monthly': 'हर महीने',
  'cadence.quarterly': 'हर तिमाही',
  'cadence.annual': 'साल में एक बार',
  'cadence.irregular': 'अनियमित',
  'cadence.paused': ' · रुका हुआ',

  /* ── EMI & Credit screen ─────────────────────────────────────────────── */
  'emi.monthlyEmi': 'महीने की EMI',
  'emi.shareOfIncome': 'आमदनी का हिस्सा',
  'emi.creditScore': 'क्रेडिट स्कोर',
  'emi.aboveMark': '20% की सीमा से ऊपर',
  'emi.safeRange': 'सुरक्षित दायरे में',
  'emi.loans': 'कर्ज़',
  'emi.add': 'कर्ज़ जोड़ें',
  'emi.addTitle': 'कर्ज़ या कार्ड जोड़ें',
  'emi.addDescription':
    'जो भी आप पर बकाया है। EMI और ब्याज दर से ही चुकाने और प्रीपेमेंट का हिसाब बनता है।',
  'emi.save': 'देनदारी सेव करें',
  'emi.emptyTitle': 'कोई कर्ज़ दर्ज नहीं है',
  'emi.emptyBody': 'कर्ज़ जोड़ें और देखें कि बाकी बची अवधि में वह असल में कितना महँगा पड़ रहा है।',
  'emi.monthsLeft': '{count} महीने बाकी',
  'emi.interestToCome': 'ब्याज अभी बाकी',
  'emi.notClearing': 'ब्याज कम नहीं हो रहा',
  'emi.prepayment': 'प्रीपेमेंट कैलकुलेटर',
  'emi.prepaymentLead': 'अगर आज आप {name} पर एकमुश्त रकम चुका दें:',
  'emi.lumpSum': 'एकमुश्त रकम',
  'emi.interestSaved': 'ब्याज की बचत',
  'emi.monthsSaved': 'महीनों की बचत',
  'emi.noSaving': 'इस EMI से कर्ज़ पूरा नहीं चुकता, इसलिए बचत का हिसाब नहीं लगाया जा सकता।',
  'emi.creditHistory': 'क्रेडिट इतिहास',
  'emi.noScoreTitle': 'कोई स्कोर दर्ज नहीं है',
  'emi.noScoreBody': 'जब भी स्कोर देखें, यहाँ जोड़ दें — रुझान अपने आप बनता जाएगा।',

  /* ── Settings ────────────────────────────────────────────────────────── */
  'settings.membership': 'सदस्यता',
  'settings.allStages': 'सभी छह चरण खुले हैं',
  'settings.twoStages': 'पहला और दूसरा चरण खुला है',
  'settings.appearance': 'दिखावट',
  'settings.theme.light': 'हल्का',
  'settings.theme.dark': 'गहरा',
  'settings.theme.system': 'फ़ोन के हिसाब से',
  'settings.language': 'भाषा',
  'settings.languageNote': 'ऐप तुरंत बदल जाता है। आपका अपना डेटा कभी अनुवादित नहीं होता।',
  'settings.yourData': 'आपका डेटा',
  'settings.storedLocally': 'सब कुछ सिर्फ़ इसी डिवाइस पर रहता है। कहीं नहीं भेजा जाता।',
  'settings.deleteMyData': 'मेरा डेटा मिटाएँ',
  'settings.signOut': 'साइन आउट',
  'settings.confirmTitle': 'मेरा डेटा मिटाएँ?',
  'settings.confirmDescription': 'इस डिवाइस का हर रिकॉर्ड मिट जाएगा। यह वापस नहीं आ सकता।',
  'settings.confirmBody':
    'आपकी आमदनी, खर्च, कर्ज़, निवेश, लक्ष्य और पॉलिसियाँ — सब हट जाएँगी। ऐप चलता रहेगा; हर स्क्रीन अपनी खाली हालत में लौट आएगी।',
  'settings.keepMyData': 'मेरा डेटा रहने दें',
  'settings.deleteEverything': 'सब कुछ मिटाएँ',

  /* ── Record forms ────────────────────────────────────────────────────── */
  'field.name': 'नाम',
  'field.type': 'प्रकार',
  'field.amount': 'रकम',
  'field.howOften': 'कितनी बार',
  'field.currentValue': 'मौजूदा कीमत',
  'field.nominee': 'नॉमिनी',
  'field.originalAmount': 'मूल रकम',
  'field.stillOwed': 'अभी बकाया',
  'field.interestRate': 'ब्याज दर',
  'field.monthlyEmi': 'महीने की EMI',
  'field.monthsLeft': 'बचे हुए महीने',
  'field.startedOn': 'शुरू होने की तारीख',
  'field.goal': 'लक्ष्य',
  'field.targetAmount': 'लक्ष्य रकम',
  'field.savedSoFar': 'अब तक जमा',
  'field.targetDate': 'लक्ष्य तारीख',
  'form.isNeeded': '{label} भरना ज़रूरी है।',
  'form.enterNumber': 'कोई संख्या भरें।',
  'form.unreadableAmount': 'यह रकम समझ नहीं आई। 15k, 1.5L या 15,000 की तरह लिखें।',

  /* ── Empty and loading states ────────────────────────────────────────── */
  'state.loading': 'लोड हो रहा है…',
  'state.nothingYet': 'अभी यहाँ कुछ नहीं है',
}
