import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./vitest-setup.ts'],
        include: ['test/spec/**/*.test.ts'],
        coverage: {
            enabled: true,
            reporter: ['text', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/test/**'],
        },
    },
}); 