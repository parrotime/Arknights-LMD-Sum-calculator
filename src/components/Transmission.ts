import type {
  ApiError,
  CalculatorSettings,
  CalculationPath,
  CalcMode,
  CalculateResponse,
  UserLimits,
} from "../types/calculator";

export const Transmission = async (
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
  try {
   const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/find-paths`, {
     method: "POST",
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

    if (!response.ok) {
      let errorData = {
        message: `服务器响应错误: ${response.status} ${response.statusText}`,
      };
      try {
        const data = await response.json() as Partial<CalculateResponse>;
        if (data && data.error) {
          errorData.message = data.error;
        }
      } catch (jsonError) {
        // 解析错误响应失败，使用默认错误信息
      }
      const error: ApiError = new Error(errorData.message);
      error.status = response.status;
      throw error;
    }

    const data = await response.json() as CalculateResponse;

    if (!data.success) {
      const error: ApiError = new Error(
        data.error || "后端标记计算失败，但未提供错误信息"
      );
      error.status = 500;
      throw error;
    }

    return data.paths;
  } catch (error) {
    if ((error as ApiError).status) {
      throw error;
    } else {
      const networkError: ApiError = new Error(
        "无法连接到计算服务器，请检查网络连接或稍后再试。"
      );
      networkError.isNetworkError = true;
      throw networkError;
    }
  }
};
