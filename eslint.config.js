import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// skills/** holds packaged skill content, including the generated esbuild bundle.
export default defineConfig(
  { ignores: ['node_modules/**', 'skills/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
);
