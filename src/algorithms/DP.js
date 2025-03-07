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
  const MAX_PATHS_PER_SUM = 20;
  const dp = new Map([[0, [[]]]]);

  const validItems = items.filter(
    (item) => Math.abs(item.item_value) > epsilon
  );

  console.log(
    "有效物品:",
    validItems.map((i) => `${i.item_name}(${i.item_value})`)
  );

  // 第一阶段：单步路径
  for (const item of validItems) {
    const itemValue = item.item_value;
    let newSum = 0;
    let count = 0;

    while (
      count <= 5 && // 限制单一物品使用次数，避免单一解霸占
      Math.abs(newSum - target) <=
        Math.max(Math.abs(target) * 2, Math.abs(itemValue) * MAX_STEPS)
    ) {
      count++;
      newSum = itemValue * count;

      const newPath = [{ id: item.id, count }];
      const pathKey = newPath.map((s) => `${s.id}x${s.count}`).join("_");

      if (!dp.has(newSum)) dp.set(newSum, []);
      const existingPaths = dp.get(newSum);

      if (
        existingPaths.length < MAX_PATHS_PER_SUM &&
        !existingPaths.some((p) => {
          const key = p.map((s) => `${s.id}x${s.count}`).join("_");
          return key === pathKey;
        })
      ) {
        existingPaths.push(newPath);
        console.log(`单步保存路径: ${newSum} -> ${pathKey}`);
      }

      if (Math.abs(newSum - target) <= epsilon) {
        console.log(`发现精确解! sum=${newSum}, 路径: ${pathKey}`);
      }
    }
  }

  // 第二阶段：多步路径
  for (let step = 2; step <= MAX_STEPS; step++) {
    for (const item of validItems) {
      const itemValue = item.item_value;
      const currentStates = Array.from(dp.entries());

      for (const [currentSum, paths] of currentStates) {
        let newSum = currentSum;
        let count = 0;

        while (
          count <= 5 && // 限制单一物品重复次数
          Math.abs(newSum - target) <=
            Math.max(Math.abs(target) * 2, Math.abs(itemValue) * MAX_STEPS)
        ) {
          count++;
          newSum = currentSum + itemValue * count;

          if (
            Math.abs(newSum - target) <= epsilon ||
            Math.abs(newSum - target) <=
              Math.abs(target) * 2 + Math.abs(itemValue)
          ) {
            for (const oldPath of paths) {
              const newPath = [...oldPath, { id: item.id, count }]; // 直接添加新项，避免合并丢失多样性
              const pathKey = newPath
                .sort((a, b) => a.id - b.id)
                .map((s) => `${s.id}x${s.count}`)
                .join("_");

              if (!dp.has(newSum)) dp.set(newSum, []);
              const existingPaths = dp.get(newSum);

              if (
                existingPaths.length < MAX_PATHS_PER_SUM &&
                !existingPaths.some((p) => {
                  const key = p.map((s) => `${s.id}x${s.count}`).join("_");
                  return key === pathKey;
                })
              ) {
                existingPaths.push(newPath);
                console.log(`多步保存路径: ${newSum} -> ${pathKey}`);
              } else if (existingPaths.length >= MAX_PATHS_PER_SUM) {
                existingPaths.push(newPath);
                existingPaths.sort(
                  (a, b) => a.length - b.length || a[0].id - b[0].id
                );
                existingPaths.splice(MAX_PATHS_PER_SUM);
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
    if (targetPaths.length >= MAX_PATHS_PER_SUM) break; // 调整为更宽松的终止条件
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
    .map((path) => {
      const key = path.map((s) => `${s.id}x${s.count}`).join("_");
      if (uniquePaths.has(key)) return null;
      uniquePaths.add(key);
      return path;
    })
    .filter(Boolean)
    .sort((a, b) => a.length - b.length || a[0].id - b[0].id);

  console.log("去重后的路径集合:", Array.from(uniquePaths));
  console.log("最终返回结果:", finalResult);

  return finalResult;
};
