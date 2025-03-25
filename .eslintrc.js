module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true, // 添加 Jest 环境
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended", // 添加 React 推荐规则
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true, // 启用 JSX 解析
    },
  },
  settings: {
    react: {
      version: "detect", // 自动检测 React 版本
    },
  },
  rules: {
    "react/react-in-jsx-scope": "off", // 禁用此规则
    "react/no-unescaped-entities": "off", // 禁用此规则
  },
  overrides: [
    {
      files: ["src/algorithms/worker.js"],
      env: {
        worker: true,
      },
    },
  ],
};
