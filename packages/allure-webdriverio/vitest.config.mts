import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./vitest-setup.ts'],
        include: ['test/spec/**/*.test.js'],
        reporters: ["default", ["allure-vitest/reporter", { resultsDir: "./out/allure-results" }]],
        coverage: {
            enabled: true,
            include: ['src/**/*.js'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/test/**'],
        },
    },
}); 