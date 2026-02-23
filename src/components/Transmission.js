import { classifyData } from "../DataService";

export const Transmission = async (target, items = classifyData,
  { upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit }, rawGoal
) => {
  try {
   const response = await fetch(`${process.env.REACT_APP_API_URL || ""}/find-paths`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       target,
       items,
       userLimits: { upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit },
       rawGoal: rawGoal
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
      const error = new Error(errorData.message);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();

    if (!data.success) {
      const error = new Error(
        data.error || "后端标记计算失败，但未提供错误信息"
      );
      error.status = 500; 
      throw error;
    }

    return data.paths;
  } catch (error) {
    if (error.status) {
      throw error;
    } else {
      const networkError = new Error(
        "无法连接到计算服务器，请检查网络连接或稍后再试。"
      );
      networkError.isNetworkError = true; 
      throw networkError;
    }
  }
};

