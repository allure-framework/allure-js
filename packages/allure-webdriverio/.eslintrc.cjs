module.exports = {
    extends: ['../../.eslintrc.js'],
    parserOptions: {
        project: ['tsconfig.json', 'test/tsconfig.json'],
        tsconfigRootDir: __dirname,
    },
    rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
    },
}; 