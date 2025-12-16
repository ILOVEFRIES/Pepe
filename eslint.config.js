// eslint.config.js
import eslint from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import securityPlugin from "eslint-plugin-security";

export default [
  // ESLint recommended
  eslint.configs.recommended,

  // TypeScript rules
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-unused-vars": "warn",
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Security rules
  {
    files: ["src/**/*.ts"],
    plugins: {
      security: securityPlugin,
    },
    rules: {
      ...securityPlugin.configs.recommended.rules,
    },
  },
];
