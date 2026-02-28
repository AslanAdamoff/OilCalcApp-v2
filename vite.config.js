import { defineConfig } from 'vite';

export default defineConfig({
    base: '/',
    root: '.',
    build: {
        outDir: 'dist',
        target: 'es2020',
        sourcemap: false,
        cssCodeSplit: false,
    },
    server: {
        port: 5173,
        open: false,
    },
});
