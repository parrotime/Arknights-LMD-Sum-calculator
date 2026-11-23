import { CalculationRequestError, getHttpCalculationError } from "../utils/calculatorErrors";
import type {
  CalculatorSettings,
  CalculationPath,
  CalcMode,
  CalculateResponse,
  UserLimits,
} from "../types/calculator";

export const findCalculationPaths = async (
  target: number,
  settings: CalculatorSettings,
  {
    upgrade0Limit,
    upgrade1Limit,
    upgrade2Limit,
    sanityLimit,
    trade2Limit,
    trade3Limit,
    trade4Limit,
    trade5Limit,
  }: UserLimits,
  rawGoal: number,
  calcMode: CalcMode = "fast",
): Promise<CalculationPath[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/find-paths`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target,
        settings,
        userLimits: {
          upgrade0Limit,
          upgrade1Limit,
          upgrade2Limit,
          sanityLimit,
          trade2Limit,
          trade3Limit,
          trade4Limit,
          trade5Limit,
        },
        rawGoal,
        calcMode,
      }),
    });

    if (!response.ok && response.status !== 503) {
      throw new CalculationRequestError(getHttpCalculationError(response.status));
    }

    const data = await response.json().catch(() => null) as
      (Partial<Omit<CalculateResponse, "paths">> & { paths?: CalculationPath[] | null; maintenance?: unknown }) | null;
    if (controller.signal.aborted) throw new CalculationRequestError({ key: "timeout" });
    if (!response.ok) {
      throw new CalculationRequestError(getHttpCalculationError(response.status, Boolean(data?.maintenance)));
    }
    if (data?.success !== true || (data.paths !== null && !Array.isArray(data.paths))) {
      throw new CalculationRequestError({ key: "server" });
    }
    return data.paths ?? [];
  } catch (error) {
    if (error instanceof CalculationRequestError) throw error;
    throw new CalculationRequestError({ key: controller.signal.aborted ? "timeout" : "network" });
  } finally {
    clearTimeout(timer);
  }
};
