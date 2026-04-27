import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'mastery', name: 'Mastery (Classic)', color: '#6366f1' },
  { id: 'monolith', name: 'Monolith (Centered)', color: '#ffffff' },
  { id: 'terminal', name: 'Terminal (Hacker)', color: '#00ff00' },
  { id: 'island', name: 'Island (Floating)', color: '#ec4899' },
  { id: 'ethereal', name: 'Ethereal (Typo)', color: '#818cf8' },
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
