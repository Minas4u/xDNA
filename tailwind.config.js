/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enables class-based dark mode (e.g., <html class="dark">)
  content: [
    './*.{html,js}', // Scans HTML and JS files for classes to include in the final CSS
  ],
  theme: {
    extend: {
      colors: {
        // Brand & Title Colors
        'brand-d': '#0284c7',
        'brand-a': '#f59e0b',
        'brand-n-start': '#0284c7',
        'brand-n-end': '#f59e0b',

        // Navigation Button Active States
        'nav-overview': '#0284c7', 'nav-overview-hover': '#0369a1',
        'nav-plan': '#f59e0b', 'nav-plan-hover': '#d97706',
        'nav-calendar': '#059669', 'nav-calendar-hover': '#047857',
        'nav-race': '#7c3aed', 'nav-race-hover': '#6d28d9',
        'nav-info': '#6366f1', 'nav-info-hover': '#4f46e5',
        'nav-companion': '#10b981', 'nav-companion-hover': '#047857',
        
        // Phase Colors
        'phase-preseason': { text: '#4b5563', border: '#d1d5db', bg: '#f3f4f6', active: '#6b7280' },
        'phase-base': { text: '#0369a1', border: '#0ea5e9', bg: '#e0f2fe', active: '#0ea5e9' },
        'phase-specific': { text: '#047857', border: '#10b981', bg: '#d1fae5', active: '#059669' },
        'phase-taper': { text: '#b91c1c', border: '#ef4444', bg: '#fee2e2', active: '#dc2626' },

        // Activity Text Colors
        'activity-easy': '#16a34a', 'dark:activity-easy': '#4ade80',
        'activity-recovery': '#075985', 'dark:activity-recovery': '#7dd3fc',
        'activity-base': '#1e40af', 'dark:activity-base': '#93c5fd',
        'activity-tempo': '#b45309', 'dark:activity-tempo': '#fdba74',
        'activity-interval': '#991b1b', 'dark:activity-interval': '#fca5a5',
        'activity-fartlek': '#831843', 'dark:activity-fartlek': '#f9a8d4',
        'activity-str': '#713f12', 'dark:activity-str': '#d4af80',
        'activity-rest': '#374151', 'dark:activity-rest': '#9ca3af',
        'activity-zone': '#5b21b6', 'dark:activity-zone': '#c4b5fd',
        'activity-double': '#78350f', 'dark:activity-double': '#fcd34d',
        'activity-mobility': '#713f12', 'dark:activity-mobility': '#d4af80',
      },
      fontFamily: {
        sans: ['Ubuntu', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
