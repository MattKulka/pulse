import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens wired to CSS custom properties (see src/index.css).
        // These flip automatically between light and `.dark` themes.
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        content: 'var(--text)',
        'content-muted': 'var(--text-muted)',
        border: 'var(--border)',
        // Categorical chart palette (color is never the sole signal —
        // magnitude is also encoded via size/opacity in chart marks).
        'chart-1': 'var(--c-1)',
        'chart-2': 'var(--c-2)',
        'chart-3': 'var(--c-3)',
        'chart-4': 'var(--c-4)',
        'chart-5': 'var(--c-5)',
        'chart-6': 'var(--c-6)',
      },
    },
  },
  plugins: [],
} satisfies Config
