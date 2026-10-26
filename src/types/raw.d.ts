// Files imported as text, `import text from './file.md?raw'` (next.config.mjs).
declare module '*?raw' {
    const text: string;
    export default text;
}
