import { defineConfig } from 'vite';

export default defineConfig({
    base: '/',
    root: '.',
    build: {
        outDir: 'dist',
        target: 'es2020',
        sourcemap: false,
        cssCodeSplit: true,
    },
    optimizeDeps: {
        include: [
            'firebase/app',
            'firebase/firestore',
        ],
    },
    server: {
        port: 5173,
        open: false,
    },
});
