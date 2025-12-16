// eslint.config.js
import eslint from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  // ESLint recommended rules (JS)
  eslint.configs.recommended,

  // TypeScript recommended rules
  {
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    extends: ["plugin:@typescript-eslint/recommended"],
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Security rules
  {
    plugins: {
      security: await import("eslint-plugin-security"),
    },
    extends: ["plugin:security/recommended"],
    files: ["src/**/*.ts"],
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-eval-with-expression": "warn",
    },
  },
];
