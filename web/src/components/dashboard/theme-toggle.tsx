'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by waiting until component is mounted
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 animate-pulse bg-muted rounded-md" />;
  }

  return (
    <div className="theme-popup">
      <input 
        type="radio" 
        name="theme" 
        id="light" 
        checked={theme === 'light'} 
        onChange={() => setTheme('light')} 
      />
      <input 
        type="radio" 
        name="theme" 
        id="dark" 
        checked={theme === 'dark'} 
        onChange={() => setTheme('dark')} 
      />
      <input 
        type="radio" 
        name="theme" 
        id="default" 
        checked={theme === 'system'} 
        onChange={() => setTheme('system')} 
      />
      <input type="checkbox" id="checkbox" />
      
      <label htmlFor="checkbox" className="theme-popup__button" title="Ganti Tema">
        <div className="theme-popup__icons">
          <Sun className="sun h-4 w-4" />
          <Moon className="moon h-4 w-4" />
          <Laptop className="default h-4 w-4" />
        </div>
      </label>
      
      <div className="theme-popup__list-container">
        <ul className="theme-popup__list">
          <li>
            <label htmlFor="light">
              <Sun className="h-4 w-4" />
              <span>Light</span>
            </label>
          </li>
          <li>
            <label htmlFor="dark">
              <Moon className="h-4 w-4" />
              <span>Dark</span>
            </label>
          </li>
          <li>
            <label htmlFor="default">
              <Laptop className="h-4 w-4" />
              <span>System</span>
            </label>
          </li>
        </ul>
      </div>
    </div>
  );
}
