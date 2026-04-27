import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'legacy', name: 'Legacy Mastery', color: '#6366f1' },
  { id: 'sakura', name: 'Sakura Bloom', color: '#ff8fa3' },
  { id: 'cyber', name: 'Cyber Grid', color: '#00ff00' },
  { id: 'paperback', name: 'Paperback', color: '#1a1a1a' },
  { id: 'liquid', name: 'Glass Liquid', color: '#0ea5e9' },
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
