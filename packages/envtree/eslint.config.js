import { config } from "@repo/eslint-config/base";
import tsEslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config} */
export default tsEslint.config(
  { ignores: ["dist"] },
  {
    extends: [...config],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: new URL(".", import.meta.url).pathname,
      },
    },
  },
  {
    rules: {
      "unicorn/prefer-node-protocol": "off",
    },
  }
);
