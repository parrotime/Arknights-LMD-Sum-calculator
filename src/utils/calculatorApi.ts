import { findCalculationPaths } from "../services/calculatorService";
import {
  parseStoredObject,
  removeStorageItem,
  setStorageItem,
} from "./calculatorPersistence";
import type {
  ApiError,
  CalcMode,
  CalculationPath,
  CalculatorSettings,
  UserLimits,
} from "../types/calculator";

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

export const callCalculatorApi = (
  difference: number,
  settings: CalculatorSettings,
  limits: UserLimits,
  num2Val: number,
  calcMode: CalcMode = "fast",
): Promise<CalculationPath[]> =>
  Promise.race([
    findCalculationPaths(difference, settings, limits, num2Val, calcMode),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("计算超时,请重试")), 18000)
    ),
  ]);

export const formatCalculatorError = (error: unknown): string => {
  const apiError = error as ApiError;
  if (apiError.isNetworkError) return apiError.message;
  if (apiError.status) {
    const map = {
      400: `输入错误: ${apiError.message}`,
      429: `请求过于频繁: ${apiError.message}`,
      503: "服务器繁忙，请稍后再试",
      504: `计算超时: ${apiError.message}`,
      500: `服务器内部错误: ${apiError.message}. 如果问题持续，请联系管理员。`,
    };
    return map[apiError.status as keyof typeof map] || `请求失败: ${apiError.message} (代码: ${apiError.status})`;
  }
  return apiError.message ? `发生错误: ${apiError.message}` : "发生未知错误，请稍后再试。";
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
