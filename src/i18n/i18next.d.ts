import "i18next";
import type common from "./locales/zh-CN/common.json";
import type calculator from "./locales/zh-CN/calculator.json";
import type results from "./locales/zh-CN/results.json";
import type errors from "./locales/zh-CN/errors.json";
import type note from "./locales/zh-CN/note.json";
import type data from "./locales/zh-CN/data.json";
import type about from "./locales/zh-CN/about.json";
import type maintenance from "./locales/zh-CN/maintenance.json";
import type assistant from "./locales/zh-CN/assistant.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: { common: typeof common; calculator: typeof calculator; results: typeof results; errors: typeof errors; note: typeof note; data: typeof data; about: typeof about; maintenance: typeof maintenance; assistant: typeof assistant };
  }
}
