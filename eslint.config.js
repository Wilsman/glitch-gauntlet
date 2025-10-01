import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import': importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      'prefer-const': 'off',
      "react-hooks/rules-of-hooks": "error", 
      "react-hooks/exhaustive-deps": "error",
      '@typescript-eslint/no-unused-vars': "off",
      '@typescript-eslint/no-explicit-any': 'off',
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],
      'import/named': 'error',
      'import/default': 'error',
      'import/no-unresolved': ['error', { 
        ignore: ['cloudflare:workers', 'agents'] 
      }],

      // Disabled: This rule produces too many false positives with inline arrow functions
      // and nested event handlers. The react-hooks/exhaustive-deps rule already catches
      // most problematic patterns. If you need to re-enable, consider using a plugin
      // specifically designed for this purpose.
      // "no-restricted-syntax": [
      //   "error",
      //   {
      //     "selector": ":function[id.name=/^[A-Z]/] > BlockStatement > ExpressionStatement > CallExpression[callee.name=/^set[A-Z]/]",
      //     "message": "State setters should not be called directly in the component's render body."
      //   }
      // ],
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
  },
  // Disable react-refresh/only-export-components for UI components
  // as shadcn/ui components commonly export both components and utilities
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
