import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      'apps/backend/src/@generated/**',
      'apps/frontend/next-env.d.ts',
    ],
  },

  // Base config for all TS files
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Prettier (must be last to override formatting rules)
  eslintPluginPrettier,

  // Global rules
  {
    rules: {
      // No any
      '@typescript-eslint/no-explicit-any': 'error',

      // Prefer type imports
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Unused vars (allow _ prefix for intentionally unused)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // No empty interfaces (allow extending)
      '@typescript-eslint/no-empty-interface': ['error', { allowSingleExtends: true }],

      // No console.log (use structured logging)
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // Prefer const
      'prefer-const': 'error',

      // No var
      'no-var': 'error',

      // Strict equality
      eqeqeq: ['error', 'always'],
    },
  },

  // Backend-specific overrides (NestJS)
  {
    files: ['apps/backend/**/*.ts'],
    rules: {
      // NestJS uses empty constructors for DI sometimes
      '@typescript-eslint/no-empty-function': 'off',

      // Allow require() in NestJS config files
      '@typescript-eslint/no-require-imports': 'off',

      // NestJS DI requires value imports for injectable classes — type-only imports
      // erase the token at runtime and break DI resolution. Disable auto-fix.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // Frontend-specific overrides (Next.js/React)
  {
    files: ['apps/frontend/**/*.ts', 'apps/frontend/**/*.tsx'],
    rules: {
      // React components can have complex return types
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Test files — relaxed rules
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // Config/seed files — relaxed
  {
    files: ['**/seed.ts', '**/jest.config.*', '**/*.config.*'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
