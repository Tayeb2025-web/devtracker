import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/api';
import { ThemeContext } from './ThemeContextStore';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('devtracker-theme') || 'dark');

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
    localStorage.setItem('devtracker-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await userApi.updateSettings({ theme: newTheme });
    } catch {
      // Local preference saved
    }
  }, [theme]);

  useEffect(() => {
    userApi.getProfile().then(res => {
      if (res.data?.theme) setTheme(res.data.theme);
    }).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

