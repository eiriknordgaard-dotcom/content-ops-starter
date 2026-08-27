import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
    ...nextVitals,
    ...nextTypescript,
    globalIgnores(['.next/**', 'out/**', 'output/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts']),
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@next/next/no-img-element': 'off',
            'react/no-unescaped-entities': 'off',
            // The content registry returns stable, module-level component references.
            'react-hooks/static-components': 'off',
            // Theme hydration and reduced-motion detection intentionally synchronize browser state after mount.
            'react-hooks/set-state-in-effect': 'off'
        }
    }
]);
