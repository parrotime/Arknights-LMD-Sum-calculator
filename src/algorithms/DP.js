

export const findPaths = (target, items, epsilon = 1e-6) => {
  console.log("Target:", target); // 输出目标差值
  console.log("Items:", items); // 输出所有物品

  if (
    typeof target !== "number" ||
    !Array.isArray(items) ||
    items.some((i) => typeof i?.item_value !== "number")
  ) {
    return [[]];
  }

  const MAX_STEPS = 6;
  const dp = new Map([[0, [{}]]]);
  const visited = new Set();

  const validItems = items.filter((item) => item.item_value !== 0);

  console.log("Valid Items:", validItems); // 输出过滤后的物品

  validItems.forEach((item) => {
    const currentEntries = Array.from(dp.entries());

    currentEntries.forEach(([currentSum, paths]) => {

console.log("生成的paths路径数据:", paths);


      const remaining = target - currentSum;
      const valueSign = Math.sign(item.item_value);

      const maxPerStep = Math.floor(Math.abs(remaining / item.item_value));
      if (maxPerStep <= 0) return;

      const stepBase = Math.max(1, Math.floor(maxPerStep / 10));

      for (let count = 1; count <= maxPerStep; count += stepBase) {
        const exactCount = Math.min(count, maxPerStep);
        const newSum = currentSum + item.item_value * exactCount;

        console.log(
          `Trying item ${item.item_name} with value ${item.item_value}, count ${exactCount}, new sum: ${newSum}`
        );

        if (Math.abs(newSum - target) > epsilon) continue;

        paths.forEach((originalPath) => {
          const newPath = { ...originalPath };
          newPath[item.id] = (newPath[item.id] || 0) + exactCount;

          const stepCount = Object.values(newPath).reduce((a, b) => a + b, 0);

          if (stepCount <= MAX_STEPS) {
            const pathKey = JSON.stringify(newPath);
            if (!visited.has(pathKey)) {
              visited.add(pathKey);
              if (!dp.has(newSum)) dp.set(newSum, []);
              dp.get(newSum).push(newPath);
            }
          }
        });
      }
    });
  });

  const result = Array.from(dp.entries())
    .filter(([sum]) => Math.abs(sum - target) <= epsilon)
    .flatMap(([_, paths]) => paths)
    .map((path) => {
      const entries = Object.entries(path)
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ id, count }));
      return entries.length > 0 ? entries : [];
    });



  console.log("Paths Found:", result); // 输出计算出来的路径

  return result.length > 0 ? result : [[]];
};
