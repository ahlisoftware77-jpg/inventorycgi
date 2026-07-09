'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FontSizeContextType {
  fontScale: number;
  setFontScale: (scale: number) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScale] = useState<number>(1);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedScale = localStorage.getItem('app-font-scale');
    if (savedScale) {
      const scale = parseFloat(savedScale);
      if (!isNaN(scale)) {
        setFontScale(scale);
      }
    }
    setMounted(true);
  }, []);

  // Apply scale to root element whenever fontScale changes
  useEffect(() => {
    if (mounted) {
      const percentage = fontScale * 100;
      document.documentElement.style.fontSize = `${percentage}%`;
      localStorage.setItem('app-font-scale', fontScale.toString());
    }
  }, [fontScale, mounted]);

  return (
    <FontSizeContext.Provider value={{ fontScale, setFontScale }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};
