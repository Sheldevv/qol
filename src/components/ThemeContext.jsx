import { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext({ theme: 'dark', toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('qol-theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('qol-theme', theme);
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{
      theme,
      toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    }}>
      {children}
    </ThemeCtx.Provider>
  );
}
