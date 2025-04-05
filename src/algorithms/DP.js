import { classifyData } from "../DataService";
// 全局函数：获取物品最大使用次数?

// eslint-disable-next-line no-unused-vars
export const findPaths = async (
  target,
  items = classifyData,
  { upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit }
) => {
  console.log("计算目标差值:", target);
  console.log("原始 items 数据:", items);
  console.log("发送 userLimits:", {
    upgrade0Limit,
    upgrade1Limit,
    upgrade2Limit,
    sanityLimit,
  });
  try {
    const response = await fetch("http://localhost:3001/find-paths", {
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
    const data = await response.json();
    if (!data.success) {
      console.error("后端计算失败:", data.error);
      return [];
    }
    console.log("后端计算耗时:", data.duration, "ms");
    console.log("最终返回结果:", JSON.stringify(data.paths, null, 2));
    return data.paths;
  } catch (error) {
    console.error("调用后端接口失败:", error);
    return [];
  }
};

