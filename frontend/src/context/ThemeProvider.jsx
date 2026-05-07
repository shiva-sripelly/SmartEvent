import { useEffect, useMemo, useState } from "react";
import { THEME_STORAGE_KEY, ThemeContext } from "./themeData";

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "light" ? "light" : "dark";
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isLightMode: theme === "light",
      toggleTheme: () =>
        setTheme((currentTheme) =>
          currentTheme === "light" ? "dark" : "light"
        ),
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
