import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import simplifiedChinese from "./locales/zh-CN/common.json";
import traditionalChinese from "./locales/zh-TW/common.json";
import simplifiedCalculator from "./locales/zh-CN/calculator.json";
import traditionalCalculator from "./locales/zh-TW/calculator.json";
import simplifiedResults from "./locales/zh-CN/results.json";
import traditionalResults from "./locales/zh-TW/results.json";
import simplifiedErrors from "./locales/zh-CN/errors.json";
import traditionalErrors from "./locales/zh-TW/errors.json";
import simplifiedNote from "./locales/zh-CN/note.json";
import traditionalNote from "./locales/zh-TW/note.json";
import simplifiedData from "./locales/zh-CN/data.json";
import traditionalData from "./locales/zh-TW/data.json";
import simplifiedAbout from "./locales/zh-CN/about.json";
import traditionalAbout from "./locales/zh-TW/about.json";
import simplifiedMaintenance from "./locales/zh-CN/maintenance.json";
import traditionalMaintenance from "./locales/zh-TW/maintenance.json";
import simplifiedAssistant from "./locales/zh-CN/assistant.json";
import traditionalAssistant from "./locales/zh-TW/assistant.json";

export const LANGUAGE_STORAGE_KEY = "ark_lmd_language";
export const supportedLanguages = ["zh-CN", "zh-TW"] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

export const isSupportedLanguage = (language: string | null): language is SupportedLanguage =>
  supportedLanguages.some((supported) => supported === language);

const getInitialLanguage = (): SupportedLanguage => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(saved) ? saved : "zh-CN";
  } catch {
    return "zh-CN";
  }
};

const i18n = createInstance();

const syncLanguage = (language: string) => {
  if (!isSupportedLanguage(language)) return;

  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
    document.title = i18n.t("app.name", { lng: language });
  }

  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    return;
  }
};

i18n.on("languageChanged", syncLanguage);

void i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { common: simplifiedChinese, calculator: simplifiedCalculator, results: simplifiedResults, errors: simplifiedErrors, note: simplifiedNote, data: simplifiedData, about: simplifiedAbout, maintenance: simplifiedMaintenance, assistant: simplifiedAssistant },
    "zh-TW": { common: traditionalChinese, calculator: traditionalCalculator, results: traditionalResults, errors: traditionalErrors, note: traditionalNote, data: traditionalData, about: traditionalAbout, maintenance: traditionalMaintenance, assistant: traditionalAssistant },
  },
  lng: getInitialLanguage(),
  fallbackLng: "zh-CN",
  supportedLngs: [...supportedLanguages],
  load: "currentOnly",
  defaultNS: "common",
  ns: ["common", "calculator", "results", "errors", "note", "data", "about", "maintenance", "assistant"],
  initAsync: false,
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

export default i18n;
