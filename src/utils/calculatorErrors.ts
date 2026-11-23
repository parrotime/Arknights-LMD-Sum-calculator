import type { CalculationErrorKey, CalculatorError } from "../types/calculator";

const httpErrors: Partial<Record<number, CalculationErrorKey>> = {
  400: "badRequest",
  429: "rateLimit",
  500: "server",
  503: "busy",
  504: "timeout",
};

export const getHttpCalculationError = (status: number, maintenance = false): CalculatorError => {
  if (status === 503 && maintenance) return { key: "maintenance" };
  const key = httpErrors[status];
  return key ? { key } : { key: "request", status };
};

export class CalculationRequestError extends Error {
  constructor(readonly notice: CalculatorError) {
    super(notice.key);
  }
}

const legacyPrefixes: Array<[string, CalculationErrorKey]> = [
  ["计算完成，但未找到", "noSolution"],
  ["无法连接到计算服务器", "network"],
  ["输入错误", "badRequest"],
  ["请求过于频繁", "rateLimit"],
  ["服务器繁忙", "busy"],
  ["计算超时", "timeout"],
  ["发生错误: 计算超时", "timeout"],
  ["服务器内部错误", "server"],
];

export const restoreCalculationError = (saved: CalculatorError | string | null | undefined): CalculatorError | null => {
  if (!saved) return null;
  if (typeof saved !== "string") return saved;

  const legacyKey = legacyPrefixes.find(([prefix]) => saved.startsWith(prefix))?.[1];
  if (legacyKey) return { key: legacyKey };

  const status = saved.startsWith("请求失败") ? saved.match(/\(代码: (\d+)\)$/)?.[1] : undefined;
  return status ? getHttpCalculationError(Number(status)) : { key: "unknown" };
};
