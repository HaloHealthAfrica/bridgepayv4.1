module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Code quality
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    'no-console': ['warn', { 
      allow: ['warn', 'error'] 
    }],
    'prefer-const': 'warn',
    'no-var': 'error',
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Style (handled by Prettier, but some rules here)
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'always-multiline'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    
    // Import organization
    'sort-imports': ['warn', {
      ignoreCase: true,
      ignoreDeclarationSort: true,
      ignoreMemberSort: false,
    }],
  },
  overrides: [
    {
      files: ['*.jsx', '*.tsx'],
      rules: {
        // React-specific rules can be added here
      },
    },
    {
      files: ['**/__tests__/**', '**/*.test.js', '**/*.test.jsx'],
      env: {
        jest: true,
        vitest: true,
      },
    },
  ],
};

