import type { GameItem } from "../DataService";
import traditionalItemNames from "./locales/zh-TW/gameItems.json";

const itemNamesById: Partial<Record<number, string>> = traditionalItemNames;

export const getLocalizedItemName = (item: GameItem, language?: string): string =>
  (language === "zh-TW" ? itemNamesById[item.id]?.trim() : undefined) || item.item_name;
