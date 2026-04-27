import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { userApi } from '../api';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'mastery', name: 'Mastery (Indigo)', color: '#6366f1' },
  { id: 'cyber', name: 'Cyber (Pink Neon)', color: '#ff007f' },
  { id: 'gold', name: 'Gold (Luxury)', color: '#d4af37' },
  { id: 'toxic', name: 'Toxic (Emerald)', color: '#39ff14' },
  { id: 'oceanic', name: 'Oceanic (Teal)', color: '#0ea5e9' },
];

export function ThemeProvider({ children }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [theme, setThemeState] = useState('mastery');

  // Detect if current page is an Auth page
  const isAuthPage = ['/login', '/register', '/setup'].includes(location.pathname);

  // Sync with profile theme on login
  useEffect(() => {
    if (profile?.theme) {
      setThemeState(profile.theme);
    } else if (!user) {
      setThemeState('mastery'); // Reset to default on logout
    }
  }, [profile?.theme, user]);

  // Apply theme to body
  useEffect(() => {
    const body = document.body;
    THEMES.forEach(t => body.classList.remove(`theme-${t.id}`));
    
    // Auth pages always use 'mastery'
    const activeTheme = isAuthPage ? 'mastery' : theme;
    body.classList.add(`theme-${activeTheme}`);
  }, [theme, isAuthPage]);

  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    if (user) {
      try {
        await userApi.updateTheme(user.uid, newTheme);
      } catch (err) {
        console.error('Failed to sync theme to account:', err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
