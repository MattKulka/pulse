// Ambient declarations for @fontsource-variable side-effect (CSS) imports.
// These packages resolve to a stylesheet at build time (Vite handles the CSS),
// but they ship no type declarations for the bare-module import, so TS needs a
// stub to accept `import '@fontsource-variable/...'` under strict mode.
declare module '@fontsource-variable/space-grotesk'
declare module '@fontsource-variable/jetbrains-mono'
