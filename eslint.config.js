import eslint from "@eslint/js";

export default [
  eslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: "@typescript-eslint/parser", // use TS parser
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off",

      // **Warn only for any**
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
