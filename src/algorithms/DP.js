import { classifyData, getItemById } from "../DataService";

export const findPaths = (target, items, epsilon = 1e-6) => {
  console.log("计算目标差值:", target);

  if (
    typeof target !== "number" ||
    !Array.isArray(items) ||
    items.some((i) => typeof i?.item_value !== "number")
  ) {
    return [];
  }

  const MAX_STEPS = 6;
  const MAX_PATHS_PER_SUM = 10;
  const dp = new Map([[0, [[]]]]);
  const validItems = items.filter(
    (item) => Math.abs(item.item_value) > epsilon
  );

  console.log(
    "有效物品:",
    validItems.map((i) => `${i.item_name}(${i.item_value})`)
  );

  // 计算单个物品的最大可能次数，提前缓存
  const itemMaxCounts = new Map();
  for (const item of validItems) {
    const maxCount = Math.min(
      5, // 限制最大重复次数
      Math.ceil(Math.abs(target * 2) / Math.abs(item.item_value))
    );
    itemMaxCounts.set(item.id, maxCount);
  }

  // 第一阶段：单步路径（提前计算并缓存）
  for (const item of validItems) {
    const itemValue = item.item_value;
    const maxCount = itemMaxCounts.get(item.id);

    for (let count = 1; count <= maxCount; count++) {
      const newSum = itemValue * count;
      if (Math.abs(newSum - target) > Math.abs(target) * 2) break; // 提前剪枝

      const newPath = [{ id: item.id, count }];
      const pathKey = `${item.id}x${count}`;

      if (!dp.has(newSum)) dp.set(newSum, []);
      const existingPaths = dp.get(newSum);

      if (
        existingPaths.length < MAX_PATHS_PER_SUM &&
        !existingPaths.some(
          (p) => p.length === 1 && p[0].id === item.id && p[0].count === count
        )
      ) {
        existingPaths.push(newPath);
        console.log(`单步保存路径: ${newSum} -> ${pathKey}`);
      }

      if (Math.abs(newSum - target) <= epsilon) {
        console.log(`发现精确解! sum=${newSum}, 路径: ${pathKey}`);
      }
    }
  }

  // 第二阶段：多步路径（基于已有路径扩展）
  for (let step = 2; step <= MAX_STEPS; step++) {
    const currentStates = Array.from(dp.entries()).filter(
      ([sum]) => Math.abs(sum - target) <= Math.abs(target) * 2
    ); // 只处理接近 target 的状态

    for (const item of validItems) {
      const itemValue = item.item_value;
      const maxCount = itemMaxCounts.get(item.id);

      for (const [currentSum, paths] of currentStates) {
        for (let count = 1; count <= maxCount; count++) {
          const newSum = currentSum + itemValue * count;

          // 提前剪枝：如果超出范围则跳过
          if (Math.abs(newSum - target) > Math.abs(target) * 2) break;

          if (
            Math.abs(newSum - target) <= epsilon ||
            Math.abs(newSum - target) <= Math.abs(target) * 2
          ) {
            for (const oldPath of paths) {
              if (oldPath.length >= step) continue; // 限制路径长度

              const newPath = [...oldPath, { id: item.id, count }];
              const pathKey = newPath
                .map((s) => `${s.id}x${s.count}`)
                .join("_");

              if (!dp.has(newSum)) dp.set(newSum, []);
              const existingPaths = dp.get(newSum);

              if (
                existingPaths.length < MAX_PATHS_PER_SUM &&
                !existingPaths.some((p) =>
                  p.every(
                    (s, i) =>
                      i < newPath.length &&
                      s.id === newPath[i].id &&
                      s.count === newPath[i].count
                  )
                )
              ) {
                existingPaths.push(newPath);
                console.log(`多步保存路径: ${newSum} -> ${pathKey}`);
              }

              if (Math.abs(newSum - target) <= epsilon) {
                console.log(`发现精确解! sum=${newSum}, 路径: ${pathKey}`);
              }
            }
          }
        }
      }
    }

    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= MAX_PATHS_PER_SUM) break;
  }

  // 返回结果
  const result = dp.get(target) || [];
  console.log("dp.get(target) 完整内容:", result);
  console.log(
    "dp.get(target) 原始路径:",
    result.map((p) => `[${p.map((s) => `${s.id}x${s.count}`).join(", ")}]`)
  );

  const uniquePaths = new Set();
  const finalResult = result
    .filter((path) => {
      const key = path.map((s) => `${s.id}x${s.count}`).join("_");
      if (uniquePaths.has(key)) return false;
      uniquePaths.add(key);
      return true;
    })
    .sort((a, b) => a.length - b.length || a[0].id - b[0].id);

  console.log("去重后的路径集合:", Array.from(uniquePaths));
  console.log("最终返回结果:", finalResult);

  return finalResult;
};
