import assert from "node:assert/strict";
import { test } from "node:test";
import i18n, { isSupportedLanguage, LANGUAGE_STORAGE_KEY } from "./index.ts";

const flattenTranslations = (resource: Record<string, unknown>, prefix = ""): Record<string, string> =>
  Object.fromEntries(Object.entries(resource).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[path, value]]
      : Object.entries(flattenTranslations(value as Record<string, unknown>, path));
  }));

test("calculator translations preserve keys, parameters, rich text tags and rule numbers", () => {
  const simplified = flattenTranslations(i18n.getResourceBundle("zh-CN", "calculator"));
  const traditional = flattenTranslations(i18n.getResourceBundle("zh-TW", "calculator"));
  assert.deepEqual(Object.keys(traditional).sort(), Object.keys(simplified).sort());

  for (const [key, text] of Object.entries(simplified)) {
    assert.ok(traditional[key].trim(), `Empty translation: ${key}`);
    for (const pattern of [/\{\{[^}]+\}\}/g, /<\/?[a-z]+>/g, /\d+/g]) {
      assert.deepEqual(traditional[key].match(pattern), text.match(pattern), `Translation mismatch: ${key}`);
    }
  }
});

test("calculator namespace translates dynamic settings and falls back for missing entries", async () => {
  const original = structuredClone(i18n.getResourceBundle("zh-TW", "calculator"));
  try {
    await i18n.changeLanguage("zh-TW");
    assert.equal(i18n.t("limits.warning", { ns: "calculator", label: "精零人數", max: 10 }),
      "精零人數的上限是 10，已按上限處理");
    assert.equal(i18n.t("settings.options.allowCE.text", { ns: "calculator" }),
      "允許使用龍門幣副本(CE系列關卡)");
    i18n.removeResourceBundle("zh-TW", "calculator");
    assert.equal(i18n.t("operation.calculate", { ns: "calculator" }), "立即计算");
  } finally {
    i18n.addResourceBundle("zh-TW", "calculator", original);
    await i18n.changeLanguage("zh-CN");
  }
});

test("starts in simplified Chinese and rejects unsupported saved language values", () => {
  assert.equal(i18n.resolvedLanguage, "zh-CN");
  assert.equal(isSupportedLanguage("zh-TW"), true);
  assert.equal(isSupportedLanguage("en"), false);
  assert.equal(isSupportedLanguage(null), false);
});

test("missing and empty traditional translations fall back to simplified Chinese", async () => {
  const original = structuredClone(i18n.getResourceBundle("zh-TW", "common"));
  try {
    i18n.removeResourceBundle("zh-TW", "common");
    i18n.addResourceBundle("zh-TW", "common", { app: { name: "測試" }, nav: { about: "" } });
    await i18n.changeLanguage("zh-TW");
    assert.equal(i18n.t("nav.data"), "数据档案");
    assert.equal(i18n.t("nav.about"), "关于");
  } finally {
    i18n.removeResourceBundle("zh-TW", "common");
    i18n.addResourceBundle("zh-TW", "common", original);
    await i18n.changeLanguage("zh-CN");
  }
});

test("switching synchronizes document and storage, tolerating blocked storage", async () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const stored = new Map<string, string>();
  const pageDocument = { documentElement: { lang: "zh-CN" }, title: "" };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { setItem: (key: string, value: string) => stored.set(key, value) },
  });
  Object.defineProperty(globalThis, "document", { configurable: true, value: pageDocument });
  try {
    await i18n.changeLanguage("zh-TW");
    assert.equal(stored.get(LANGUAGE_STORAGE_KEY), "zh-TW");
    assert.equal(pageDocument.documentElement.lang, "zh-TW");
    assert.equal(pageDocument.title, "龍門幣湊數計算器");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => { throw new Error("Storage blocked"); },
    });
    await i18n.changeLanguage("zh-CN");
    assert.equal(pageDocument.documentElement.lang, "zh-CN");
    assert.equal(i18n.t("nav.data"), "数据档案");
  } finally {
    if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
    else Reflect.deleteProperty(globalThis, "document");
    await i18n.changeLanguage("zh-CN");
  }
});
