import type { AppLanguage } from '../types';

export interface TranslationDictionary {
  appName: string;
  appSubtitle: string;
  beginReflection: string;
  newReflection: string;
  pastReflections: string;
  searchPlaceholder: string;
  inputPlaceholder: string;
  replyPlaceholder: string;
  onThisDay: string;
  revisitEntry: string;
  reflectCTA: string;
  summarizeBtn: string;
  synthesizing: string;
  insightsBtn: string;
  remindersBtn: string;
  tourBtn: string;
  signOutBtn: string;
  languageName: string;
  modeReflective: string;
  modeBrainstorm: string;
  modeActionable: string;
  modeSummary: string;
  favorites: string;
  sortBy: string;
  sortNewest: string;
  sortOldest: string;
  sortTitle: string;
  sortActivity: string;
  noReflections: string;
  noReflectionsDetail: string;
  customLocationSet: string;
  autoDetectLocation: string;
  locating: string;
  locationHeader: string;
  exportMarkdown: string;
  printPDF: string;
  deleteConfirm: string;
  undo: string;
  adminMode: string;
}

export const TRANSLATIONS: Record<AppLanguage, TranslationDictionary> = {
  en: {
    appName: 'DearMe',
    appSubtitle: 'Mindful Intelligence & Reflection Space',
    beginReflection: 'Begin Your Reflection',
    newReflection: 'New Reflection',
    pastReflections: 'Past Reflections',
    searchPlaceholder: 'Search reflections, photos, locations...',
    inputPlaceholder: 'Pour your thoughts, feelings, or record a voice note...',
    replyPlaceholder: 'Reply or continue your reflection...',
    onThisDay: 'On This Day Spotlight',
    revisitEntry: 'Revisit Entry',
    reflectCTA: 'Reflect',
    summarizeBtn: 'Synthesize Summary',
    synthesizing: 'Synthesizing...',
    insightsBtn: 'Insights',
    remindersBtn: 'Reminders',
    tourBtn: 'Guide',
    signOutBtn: 'Sign Out',
    languageName: 'English',
    modeReflective: 'Gentle Reflection',
    modeBrainstorm: 'Brainstorming',
    modeActionable: 'Action Steps',
    modeSummary: 'Synthesize',
    favorites: 'Favorites',
    sortBy: 'Sort By',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortTitle: 'Title (A-Z)',
    sortActivity: 'Most Activity',
    noReflections: 'No reflections found',
    noReflectionsDetail: 'Begin your first reflection session or adjust search filters.',
    customLocationSet: 'Set location:',
    autoDetectLocation: 'Auto-Detect',
    locating: 'Locating...',
    locationHeader: 'Set Reflection Location',
    exportMarkdown: 'Export as Markdown',
    printPDF: 'Print / Save as PDF',
    deleteConfirm: 'Reflection entry queued for deletion.',
    undo: 'Undo (5s)',
    adminMode: 'Admin Mode',
  },
  hi: {
    appName: 'DearMe',
    appSubtitle: 'आत्म-चिंतन और व्यक्तिगत डायरी स्थान',
    beginReflection: 'अपनी विचार यात्रा शुरू करें',
    newReflection: 'नई अभिव्यक्ति',
    pastReflections: 'पिछली यादें',
    searchPlaceholder: 'खोजें विचार, तस्वीरें, स्थान...',
    inputPlaceholder: 'अपने विचार, भावनाएँ साझा करें या वॉइस नोट रिकॉर्ड करें...',
    replyPlaceholder: 'उत्तर दें या अपना चिंतन जारी रखें...',
    onThisDay: 'आज के दिन की यादें',
    revisitEntry: 'पुराना संस्मरण देखें',
    reflectCTA: 'चिंतन करें',
    summarizeBtn: 'सार बनाएं',
    synthesizing: 'संश्लेषण हो रहा है...',
    insightsBtn: 'अंतर्दृष्टि',
    remindersBtn: 'रिमाइंडर',
    tourBtn: 'मार्गदर्शन',
    signOutBtn: 'साइन आउट',
    languageName: 'हिन्दी',
    modeReflective: 'सहज विचार',
    modeBrainstorm: 'नये दृष्टिकोण',
    modeActionable: 'अगले कदम',
    modeSummary: 'मुख्य सार',
    favorites: 'पसंदीदा',
    sortBy: 'क्रमबद्ध करें',
    sortNewest: 'नवीनतम',
    sortOldest: 'पुराने',
    sortTitle: 'शीर्षक (A-Z)',
    sortActivity: 'अधिकतम गतिविधियाँ',
    noReflections: 'कोई विचार नहीं मिला',
    noReflectionsDetail: 'अपनी पहली विचार यात्रा शुरू करें या खोज फ़िल्टर बदलें।',
    customLocationSet: 'स्थान तय करें:',
    autoDetectLocation: 'स्वचालित खोज',
    locating: 'खोज जारी है...',
    locationHeader: 'स्थान चुनें',
    exportMarkdown: 'मार्कडाउन निर्यात करें',
    printPDF: 'प्रिंट / पीडीएफ सहेजें',
    deleteConfirm: 'विचार हटाने के लिए कतारबद्ध है।',
    undo: 'पूर्ववत करें (5से)',
    adminMode: 'एडमिन मोड',
  },
  gu: {
    appName: 'DearMe',
    appSubtitle: 'આત્મ-ચિંતન અને વ્યક્તિગત ડાયરી',
    beginReflection: 'તમારી ચિંતન યાત્રા શરૂ કરો',
    newReflection: 'નવું ચિંતન',
    pastReflections: 'પાછલા સંસ્મરણો',
    searchPlaceholder: 'શોધો વિચારો, ફોટા, સ્થળ...',
    inputPlaceholder: 'તમારા વિચારો, લાગણીઓ વ્યક્ત કરો અથવા વૉઇસ નોટ રેકોર્ડ કરો...',
    replyPlaceholder: 'જવાબ આપો અથવા ચિંતન આગળ ધપાવો...',
    onThisDay: 'આજના દિવસે',
    revisitEntry: 'જૂની યાદ જુઓ',
    reflectCTA: 'મનન કરો',
    summarizeBtn: 'સારાંશ બનાવો',
    synthesizing: 'સારાંશ બની રહ્યો છે...',
    insightsBtn: 'આંતરદ્રષ્ટિ',
    remindersBtn: 'રિમાઇન્ડર',
    tourBtn: 'માર્ગદર્શન',
    signOutBtn: 'સાઇન આઉટ',
    languageName: 'ગુજરાતી',
    modeReflective: 'શાંત ચિંતન',
    modeBrainstorm: 'નવા વિચારો',
    modeActionable: 'આગળના પગલાં',
    modeSummary: 'મુખ્ય બાબતો',
    favorites: 'મનપસંદ',
    sortBy: 'ગોઠવો',
    sortNewest: 'નવીનતમ',
    sortOldest: 'જૂના',
    sortTitle: 'શીર્ષક (A-Z)',
    sortActivity: 'સૌથી વધુ પ્રવૃત્તિ',
    noReflections: 'કોઈ ચિંતન મળ્યું નથી',
    noReflectionsDetail: 'તમારી પ્રથમ ચિંતન યાત્રા શરૂ કરો અથવા શોધ ફિલ્ટર બદલો.',
    customLocationSet: 'સ્થળ નક્કી કરો:',
    autoDetectLocation: 'ઓટો-ડિટેક્ટ',
    locating: 'શોધ ચાલુ છે...',
    locationHeader: 'સ્થળ પસંદ કરો',
    exportMarkdown: 'માર્કડાઉન એક્સપોર્ટ કરો',
    printPDF: 'પ્રિન્ટ / PDF સાચવો',
    deleteConfirm: 'ચિંતન દૂર કરવા માટે કતારબદ્ધ છે.',
    undo: 'પાછું ખેંચો (5સે)',
    adminMode: 'એડમિન મોડ',
  },
};

export function getTranslation(lang: AppLanguage = 'en'): TranslationDictionary {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}
