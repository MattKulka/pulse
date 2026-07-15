import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Space Grotesk drives display/UI headings; JetBrains Mono drives all
        // data, numbers, and labels. Both are self-hosted variable fonts (see
        // src/main.tsx) — no CDN, CSP-safe.
        display: ['"Space Grotesk Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Semantic tokens wired to CSS custom properties (see src/index.css).
        // These flip automatically between light and `.dark` themes.
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        content: 'var(--text)',
        'content-muted': 'var(--text-muted)',
        border: 'var(--border)',
        'border-accent': 'var(--border-accent)',
        // Reserved UI accent (electric cyan) — NOT a magnitude color. Used for
        // focus rings, the LIVE pulse, active states, panel edge, KPI glow.
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
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
