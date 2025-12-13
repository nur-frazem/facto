import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
  ORIGINAL: 'original',
  CLARO: 'claro',
};

export const THEMES_LABELS = {
  [THEMES.ORIGINAL]: 'Original',
  [THEMES.CLARO]: 'Claro',
};

// Text size options (in percentage, 100 = default)
export const TEXT_SIZES = {
  MIN: 80,
  DEFAULT: 100,
  MAX: 130,
  STEP: 5,
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Get saved theme from localStorage or default to 'original'
    const savedTheme = localStorage.getItem('facto-theme');
    return savedTheme || THEMES.ORIGINAL;
  });

  const [textSize, setTextSize] = useState(() => {
    // Get saved text size from localStorage or default to 100
    const savedSize = localStorage.getItem('facto-text-size');
    return savedSize ? parseInt(savedSize, 10) : TEXT_SIZES.DEFAULT;
  });

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
    // Save to localStorage
    localStorage.setItem('facto-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply text size to document root
    document.documentElement.style.fontSize = `${textSize}%`;
    // Save to localStorage
    localStorage.setItem('facto-text-size', textSize.toString());
  }, [textSize]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === THEMES.ORIGINAL ? THEMES.CLARO : THEMES.ORIGINAL));
  };

  const setThemeByName = (themeName) => {
    if (Object.values(THEMES).includes(themeName)) {
      setTheme(themeName);
    }
  };

  const setTextSizeValue = (size) => {
    const clampedSize = Math.max(TEXT_SIZES.MIN, Math.min(TEXT_SIZES.MAX, size));
    setTextSize(clampedSize);
  };

  const resetTextSize = () => {
    setTextSize(TEXT_SIZES.DEFAULT);
  };

  const value = {
    theme,
    setTheme: setThemeByName,
    toggleTheme,
    isLightTheme: theme === THEMES.CLARO,
    textSize,
    setTextSize: setTextSizeValue,
    resetTextSize,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
