import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'mastery', name: 'Habit Mastery (Original)', color: '#6366f1' },
  { id: 'nebula', name: 'Midnight Nebula', color: '#c084fc' },
  { id: 'ember', name: 'Onyx & Ember', color: '#f97316' },
  { id: 'stealth', name: 'Emerald Stealth', color: '#10b981' },
  { id: 'cyberrose', name: 'Cyber Rose', color: '#fb7185' },
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
