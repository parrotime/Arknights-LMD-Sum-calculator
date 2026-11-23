import {
  parseStoredObject,
  removeStorageItem,
  setStorageItem,
} from "./calculatorPersistence";
import type { CalculationPath } from "../types/calculator";

const parseStoredArray = <T,>(key: string): T[] => {
  const parsed = parseStoredObject<T[]>(key, []);
  return Array.isArray(parsed) ? parsed : [];
};

const getPathCacheQueue = (): string[] => {
  const parsed = parseStoredObject<string[]>("pathCacheQueue", []);
  if (Array.isArray(parsed)) return parsed;
  removeStorageItem("pathCacheQueue");
  return [];
};

export const checkPathCache = (cacheKey: string): CalculationPath[] | null => {
  const key = `pathCache_${cacheKey}`;
  const paths = parseStoredArray<CalculationPath>(key);
  if (paths.length > 0) return paths;
  removeStorageItem(key);
  return null;
};

export const savePathCache = (cacheKey: string, paths: CalculationPath[]): void => {
  setStorageItem(`pathCache_${cacheKey}`, JSON.stringify(paths));

  const cacheQueue = getPathCacheQueue();
  if (!cacheQueue.includes(cacheKey)) {
    cacheQueue.push(cacheKey);
    if (cacheQueue.length > 5) {
      removeStorageItem(`pathCache_${cacheQueue.shift()}`);
    }
    setStorageItem("pathCacheQueue", JSON.stringify(cacheQueue));
  }
};
