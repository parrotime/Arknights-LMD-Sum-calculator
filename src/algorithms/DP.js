import { classifyData } from "../DataService";
// 全局函数：获取物品最大使用次数字

export const Transmission = async (target, items = classifyData,
  { upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit }
) => {
  console.log("计算目标差值:", target);
  //console.log("原始 items 数据:", items);
  console.log("发送 userLimits:", {upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit});
  
  try {
   //const response = await fetch("http://47.120.73.125:3002/find-paths", {

   //添加反向代理

   //const response = await fetch("/api/find-paths", {
   const response = await fetch("/find-paths", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       target,
       items,
       userLimits: {
         upgrade0Limit,
         upgrade1Limit,
         upgrade2Limit,
         sanityLimit,
       },
     }),
   });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    // --- **修改点 1: 处理非 OK 响应** ---
    if (!response.ok) {
      let errorData = {
        message: `服务器响应错误: ${response.status} ${response.statusText}`,
      }; // 默认错误消息
      try {
        // 尝试解析后端返回的 JSON 错误信息
        const data = await response.json();
        if (data && data.error) {
          errorData.message = data.error; // 使用后端提供的错误消息
        }
      } catch (jsonError) {
        // 如果解析 JSON 失败，保持使用默认错误消息
        console.error("解析后端错误响应JSON失败:", jsonError);
      }

      // 创建并抛出包含状态码和消息的错误对象
      const error = new Error(errorData.message);
      error.status = response.status; // 附加状态码
      console.error("后端返回错误:", error.status, error.message);
      throw error; // 抛出错误，由调用者 (handleCalculate) 捕获
    }

    const data = await response.json();

    // 检查后端是否明确返回失败（虽然我们前面检查了 response.ok，但多一层保险）
    if (!data.success) {
      console.error("后端计算标记失败:", data.error);
      // 也可以选择抛出一个错误，或者按现在这样返回空数组，取决于你希望如何处理这种理论上不应发生的情况
      // 为保持一致性，我们也抛出错误
      const error = new Error(
        data.error || "后端标记计算失败，但未提供错误信息"
      );
      error.status = 500; // 假设这种情况是服务器内部逻辑问题
      throw error;
    }

    console.log("后端计算耗时:", data.duration, "ms");
    console.log("最终返回结果:", JSON.stringify(data.paths, null, 2));
    return data.paths;
  } catch (error) {
    // --- **修改点 2: 处理网络错误 或 上面抛出的错误** ---
    // 检查错误是否是我们自己添加了 status 的类型
    if (error.status) {
      // 如果是 fetch 响应错误被我们包装后抛出的，直接再次抛出
      throw error;
    } else {
      // 如果是网络错误 (fetch 本身失败) 或其他意外错误
      console.error("调用后端接口失败 (网络或未知错误):", error);
      const networkError = new Error(
        "无法连接到计算服务器，请检查网络连接或稍后再试。"
      );
      networkError.isNetworkError = true; // 添加标记以便区分
      throw networkError; // 抛出网络错误
    }
    // 注意：不再在这里返回空数组 `[]`
  }
};

