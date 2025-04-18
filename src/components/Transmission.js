import { classifyData } from "../DataService";

export const Transmission = async (target, items = classifyData,
  { upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit }
) => {
  console.log("计算目标差值:", target);
  console.log("发送 userLimits:", {upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit});
  
  try {
   //添加反向代理
   //const response = await fetch("/api/find-paths", {
   const response = await fetch("/find-paths", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       target,
       items,
       userLimits: {upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit,
       },
     }),
   });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

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
        console.error("解析后端错误响应JSON失败:", jsonError);
      }
      const error = new Error(errorData.message);
      error.status = response.status; 
      console.error("后端返回错误:", error.status, error.message);
      throw error;
    }

    const data = await response.json();

    if (!data.success) {
      console.error("后端计算标记失败:", data.error);
      const error = new Error(
        data.error || "后端标记计算失败，但未提供错误信息"
      );
      error.status = 500; 
      throw error;
    }

    console.log("后端计算耗时:", data.duration, "ms");
    console.log("最终返回结果:", JSON.stringify(data.paths, null, 2));
    return data.paths;
  } catch (error) {
    if (error.status) {
      throw error;
    } else {
      console.error("调用后端接口失败 (网络或未知错误):", error);
      const networkError = new Error(
        "无法连接到计算服务器，请检查网络连接或稍后再试。"
      );
      networkError.isNetworkError = true; 
      throw networkError;
    }
  }
};

