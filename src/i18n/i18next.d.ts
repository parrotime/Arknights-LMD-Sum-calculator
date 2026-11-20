import "i18next";
import type common from "./locales/zh-CN/common.json";
import type calculator from "./locales/zh-CN/calculator.json";
import type results from "./locales/zh-CN/results.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: { common: typeof common; calculator: typeof calculator; results: typeof results };
  }
}
