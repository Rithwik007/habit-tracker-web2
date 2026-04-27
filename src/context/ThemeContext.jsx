import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'obsidian', name: 'Obsidian Gold', color: '#fbbf24' },
  { id: 'ethereal', name: 'Ethereal Dream', color: '#f472b6' },
  { id: 'neon', name: 'Neon Drift', color: '#a855f7' },
  { id: 'nordic', name: 'Nordic Snow', color: '#64748b' },
  { id: 'bamboo', name: 'Bamboo Zen', color: '#2d6a4f' },
  { id: 'aurora', name: 'Aurora Borealis', color: '#2dd4bf' },
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
