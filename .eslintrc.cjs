module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
  ],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
      },
      plugins: ["@typescript-eslint"],
      extends: [
        "plugin:@typescript-eslint/recommended",
      ],
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/no-unescaped-entities": "off",
    "react/prop-types": "off",
    "react/jsx-no-comment-textnodes": "off",
    "no-undef": "off",
  },
};
