// ============================================================
// BakBak Chat - Dynamic Theme Presets & Engine
// File: frontend/src/lib/theme.js
// ============================================================

export const THEME_PRESETS = {
  cyberpunk: {
    name: 'Gemini Cyberpunk',
    colors: {
      '--wa-green': '#00e5ff',
      '--wa-blue': '#8a2387',
      '--wa-teal': '#0d111d',
      '--wa-teal-dark': '#06080e',
      '--wa-bg': '#06080e',
      '--wa-header': '#0d111d',
      '--wa-light': 'rgba(0, 229, 255, 0.12)',
      '--wa-input-bg': 'rgba(255, 255, 255, 0.05)',
      '--wa-bubble-sent': 'rgba(0, 229, 255, 0.15)',
      '--wa-bubble-received': 'rgba(255, 255, 255, 0.08)',
      '--wa-chat-bg': '#06080e',
    }
  },
  forest: {
    name: 'Desi Forest',
    colors: {
      '--wa-green': '#10b981',
      '--wa-blue': '#047857',
      '--wa-teal': '#061a15',
      '--wa-teal-dark': '#020f0b',
      '--wa-bg': '#020f0b',
      '--wa-header': '#061a15',
      '--wa-light': 'rgba(16, 185, 129, 0.12)',
      '--wa-input-bg': 'rgba(255, 255, 255, 0.04)',
      '--wa-bubble-sent': 'rgba(16, 185, 129, 0.15)',
      '--wa-bubble-received': 'rgba(255, 255, 255, 0.06)',
      '--wa-chat-bg': '#020f0b',
    }
  },
  sunset: {
    name: 'Sunset Glow',
    colors: {
      '--wa-green': '#f97316',
      '--wa-blue': '#db2777',
      '--wa-teal': '#1a0b12',
      '--wa-teal-dark': '#0f0308',
      '--wa-bg': '#0f0308',
      '--wa-header': '#1a0b12',
      '--wa-light': 'rgba(249, 115, 22, 0.12)',
      '--wa-input-bg': 'rgba(255, 255, 255, 0.04)',
      '--wa-bubble-sent': 'rgba(249, 115, 22, 0.15)',
      '--wa-bubble-received': 'rgba(255, 255, 255, 0.06)',
      '--wa-chat-bg': '#0f0308',
    }
  },
  blue: {
    name: 'Neon Blue',
    colors: {
      '--wa-green': '#3b82f6',
      '--wa-blue': '#1d4ed8',
      '--wa-teal': '#080f1e',
      '--wa-teal-dark': '#030712',
      '--wa-bg': '#030712',
      '--wa-header': '#080f1e',
      '--wa-light': 'rgba(59, 130, 246, 0.12)',
      '--wa-input-bg': 'rgba(255, 255, 255, 0.04)',
      '--wa-bubble-sent': 'rgba(59, 130, 246, 0.15)',
      '--wa-bubble-received': 'rgba(255, 255, 255, 0.06)',
      '--wa-chat-bg': '#030712',
    }
  },
  light: {
    name: 'Day Mode Light',
    colors: {
      '--wa-green': '#3b82f6', // Slate or blue accents
      '--wa-blue': '#1d4ed8',
      '--wa-teal': '#f8fafc',
      '--wa-teal-dark': '#f1f5f9',
      '--wa-bg': '#f1f5f9',
      '--wa-header': '#f8fafc',
      '--wa-light': 'rgba(59, 130, 246, 0.08)',
      '--wa-input-bg': 'rgba(0, 0, 0, 0.03)',
      '--wa-bubble-sent': 'rgba(59, 130, 246, 0.12)',
      '--wa-bubble-received': 'rgba(0, 0, 0, 0.04)',
      '--wa-chat-bg': '#f1f5f9',
    }
  }
};

/**
 * Apply the selected theme properties to documentElement.
 * @param {string} themeKey
 */
export function applyTheme(themeKey) {
  const preset = THEME_PRESETS[themeKey] || THEME_PRESETS.cyberpunk;
  
  // Set each color variable on document root
  Object.entries(preset.colors).forEach(([variable, value]) => {
    document.documentElement.style.setProperty(variable, value);
  });

  // Toggle light mode class
  if (themeKey === 'light') {
    document.documentElement.classList.add('light-mode');
  } else {
    document.documentElement.classList.remove('light-mode');
  }

  // Save selection
  localStorage.setItem('bakbak_theme_key', themeKey);
}

/**
 * Initialize theme from localStorage.
 */
export function initTheme() {
  const saved = localStorage.getItem('bakbak_theme_key') || 'cyberpunk';
  applyTheme(saved);
}
