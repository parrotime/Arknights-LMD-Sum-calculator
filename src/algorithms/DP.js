import { classifyData, getItemById } from "../DataService";

export const findPaths = (target, items, epsilon = 1e-6) => {
  console.log("计算目标差值:", target);

  // 输入校验
  if (
    typeof target !== "number" ||
    !Array.isArray(items) ||
    items.some((i) => typeof i?.item_value !== "number")
  ) {
    return [];
  }

  const MAX_STEPS = 6; // 最大步骤数
  const dp = new Map([[0, [[]]]]); // dp[sum] = paths
  const validItems = items.filter(
    (item) => Math.abs(item.item_value) > epsilon
  );

  console.log(
    "有效物品:",
    validItems.map((i) => `${i.item_name}(${i.item_value})`)
  );

  // 主循环
  for (const item of validItems) {
    const itemValue = item.item_value;
    const currentStates = Array.from(dp.entries()); // 复制当前状态

    for (const [currentSum, paths] of currentStates) {
      let newSum = currentSum;
      let count = 0;

      while (
        Math.abs(newSum - target) <=
        Math.max(Math.abs(target) * 2, Math.abs(itemValue) * MAX_STEPS)
      ) {
        count++;
        newSum = currentSum + itemValue * count;

        // 放宽记录条件，保留更多中间状态
        if (
          Math.abs(newSum - target) <= epsilon || // 精确匹配
          Math.abs(newSum) <= Math.abs(target) + Math.abs(itemValue) * MAX_STEPS // 合理范围
        ) {
          for (const oldPath of paths) {
            const newPath = [];
            const idCountMap = new Map(oldPath.map((s) => [s.id, s.count]));
            idCountMap.set(item.id, (idCountMap.get(item.id) || 0) + count);

            for (const [id, totalCount] of idCountMap) {
              if (totalCount > 0) newPath.push({ id, count: totalCount }); // 只记录正数次数
            }

            if (newPath.length > MAX_STEPS) continue; // 限制步骤数

            const pathKey = newPath
              .sort((a, b) => a.id - b.id)
              .map((s) => `${s.id}x${s.count}`)
              .join("_");

            if (!dp.has(newSum)) dp.set(newSum, []);
            const existingPaths = dp.get(newSum);
            if (
              !existingPaths.some(
                (p) => p.map((s) => `${s.id}x${s.count}`).join("_") === pathKey
              )
            ) {
              if (existingPaths.length < 10) existingPaths.push(newPath); // 限制路径数量
            }

            if (Math.abs(newSum - target) <= epsilon) {
              console.log(
                `发现精确解! sum=${newSum}, 路径:`,
                newPath.map((s) => `${s.id}x${s.count}`).join("+")
              );
            }
          }
        }

        // 如果远离目标，提前退出
        if (
          Math.abs(newSum - target) >
          Math.abs(currentSum - target) + Math.abs(itemValue) * MAX_STEPS
        ) {
          break;
        }
      }
    }
  }

  // 返回结果
  const result = dp.get(target) || [];
  const uniquePaths = new Set();
  return result
    .map((path) => {
      const key = path.map((s) => `${s.id}x${s.count}`).join("_");
      if (uniquePaths.has(key)) return null;
      uniquePaths.add(key);
      return path;
    })
    .filter(Boolean)
    .sort((a, b) => a.length - b.length || a[0].id - b[0].id);
};