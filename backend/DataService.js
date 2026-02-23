import { createRequire } from "module";
const require = createRequire(import.meta.url);

export const classifyData = require("../data/gameItems.json");

export const getItemById = (id) => {
  return classifyData.find((item) => item.id === id) || null;
};
