interface Settings {
  [key: string]: boolean;
}

interface UserLimits {
  upgrade0Limit: number | string;
  upgrade1Limit: number | string;
  upgrade2Limit: number | string;
  sanityLimit: number | string;
  trade2Limit: number | string;
  trade3Limit: number | string;
  trade4Limit: number | string;
  trade5Limit: number | string;
}

interface ApiError extends Error {
  status?: number;
  isNetworkError?: boolean;
}

export const Transmission = async (
  target: number,
  settings: Settings,
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
) => {
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
     }),
   });

    if (!response.ok) {
      let errorData = {
        message: `服务器响应错误: ${response.status} ${response.statusText}`,
      };
      try {
        const data = await response.json();
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

    const data = await response.json();

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
