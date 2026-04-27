import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'midnight', name: 'Midnight Noir', color: '#6366f1' },
  { id: 'emerald', name: 'Emerald Forest', color: '#10b981' },
  { id: 'cyber', name: 'Cyber Neon', color: '#f0abfc' },
  { id: 'royal', name: 'Royal Gold', color: '#fbbf24' },
  { id: 'sky', name: 'Clear Sky', color: '#38bdf8' },
  { id: 'rose', name: 'Rose Quartz', color: '#fb7185' },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'midnight');

  useEffect(() => {
    // Remove all theme classes
    const body = document.body;
    THEMES.forEach(t => body.classList.remove(`theme-${t.id}`));
    
    // Add current theme class
    body.classList.add(`theme-${theme}`);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
