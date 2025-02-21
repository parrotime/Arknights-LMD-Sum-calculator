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

  const MAX_STEPS = 6; // 最大物品种类数
  const MAX_PATHS_PER_SUM = 20; // 每种 sum 最多保留路径数
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
    const currentStates = Array.from(dp.entries());

    for (const [currentSum, paths] of currentStates) {
      let newSum = currentSum;
      let count = 0;

      while (
        Math.abs(newSum - target) <=
        Math.max(Math.abs(target) * 2, Math.abs(itemValue) * MAX_STEPS)
      ) {
        count++;
        newSum = currentSum + itemValue * count;

        if (
          Math.abs(newSum - target) <= epsilon || // 精确匹配
          Math.abs(newSum - target) <= Math.abs(target) * 2 + Math.abs(itemValue)
        ) {
          for (const oldPath of paths) {
            const newPath = [];
            const idCountMap = new Map(oldPath.map((s) => [s.id, s.count]));
            idCountMap.set(item.id, (idCountMap.get(item.id) || 0) + count);

            for (const [id, totalCount] of idCountMap) {
              if (totalCount > 0) newPath.push({ id, count: totalCount });
            }

            if (newPath.length > MAX_STEPS) continue;

            const pathKey = newPath
              .sort((a, b) => a.id - b.id)
              .map((s) => `${s.id}x${s.count}`)
              .join("_");

            if (!dp.has(newSum)) dp.set(newSum, []);
            const existingPaths = dp.get(newSum);

            // 确保精确解优先保留
            if (
              existingPaths.length < MAX_PATHS_PER_SUM &&
              !existingPaths.some(
                (p) => p.map((s) => `${s.id}x${s.count}`).join("_") === pathKey
              )
            ) {
              existingPaths.push(newPath);
              if (Math.abs(newSum - target) <= epsilon) {
                console.log(
                  `发现精确解! sum=${newSum}, 路径:`,
                  newPath.map((s) => `${s.id}x${s.count}`).join("+")
                );
              }
            }
          }
        }

        if (
          Math.abs(newSum - target) >
          Math.abs(currentSum - target) + Math.abs(itemValue) * MAX_STEPS
        ) {
          break;
        }
      }
    }
  }

  // 调试：输出 dp.get(target) 的内容
  const result = dp.get(target) || [];
  console.log(
    "dp.get(target) 原始路径:",
    result.map((p) => p.map((s) => `${s.id}x${s.count}`).join("+"))
  );

console.log("dp.get(target) 去重后路径:", result);

  // 返回结果，保留所有唯一路径
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