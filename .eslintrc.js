module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true, // ��� Jest ����
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended", // ��� React �Ƽ�����
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true, // ���� JSX ����
    },
  },
  settings: {
    react: {
      version: "detect", // �Զ���� React �汾
    },
  },
  rules: {
    "react/react-in-jsx-scope": "off", // ���ô˹���
    "react/no-unescaped-entities": "off", // ���ô˹���
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
