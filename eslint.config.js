// eslint.config.js
import eslint from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import securityPlugin from "eslint-plugin-security";

export default [
  // ESLint recommended
  eslint.configs.recommended,

  // TypeScript plugin recommended rules
  {
    files: ["src/**/*.ts"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-unused-vars": "warn",
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Security plugin recommended rules
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
