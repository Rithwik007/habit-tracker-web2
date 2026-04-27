import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'mastery', name: 'Mastery (Indigo)', color: '#6366f1' },
  { id: 'cyber', name: 'Cyber (Pink Neon)', color: '#ff007f' },
  { id: 'gold', name: 'Gold (Luxury)', color: '#d4af37' },
  { id: 'toxic', name: 'Toxic (Emerald)', color: '#39ff14' },
  { id: 'oceanic', name: 'Oceanic (Teal)', color: '#0ea5e9' },
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
