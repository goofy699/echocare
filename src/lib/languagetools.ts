import { translations, Language, TranslationKey } from "./i18n";

const STORAGE_KEY = "echocare_language";

export const languageTools = {
    // Get stored language or default to English
    getLanguage: (): Language => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "en" || stored === "ne") return stored;
        return "en";
    },

    // Set language in localStorage
    setLanguage: (lang: Language): void => {
        localStorage.setItem(STORAGE_KEY, lang);
    },

    // Translate a key with optional parameters
    t: (key: TranslationKey, params?: Record<string, string>): string => {
        const lang = languageTools.getLanguage();
        let text = translations[lang][key] || translations.en[key] || key;

        // Replace parameters like {name} with actual values
        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                text = text.replace(`{${paramKey}}`, paramValue);
            });
        }

        return text;
    },

    // Toggle between English and Nepali
    toggleLanguage: (): Language => {
        const current = languageTools.getLanguage();
        const newLang = current === "en" ? "ne" : "en";
        languageTools.setLanguage(newLang);
        return newLang;
    },
};
