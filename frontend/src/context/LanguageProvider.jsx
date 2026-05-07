import { useEffect, useMemo, useState } from "react";
import {
  LANGUAGE_STORAGE_KEY,
  LanguageContext,
  translations,
} from "./languageData";

export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLanguage && translations[savedLanguage] ? savedLanguage : "en";
  });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => {
    const t = (key, values = {}) => {
      const template = translations[language]?.[key] || translations.en[key] || key;

      return Object.entries(values).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, value),
        template
      );
    };

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
