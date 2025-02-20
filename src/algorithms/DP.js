
import { classifyData, getItemById } from '../DataService'; // 导入物品数据

export const findPaths = (target, items, epsilon = 1e-6) => {
  console.log("计算目标差值:", target);

  // 输入校验
  if (
    typeof target !== "number" ||
    !Array.isArray(items) ||
    items.some((i) => typeof i?.item_value !== "number")
  ) {
    return []; // 返回空数组而不是[[]]，避免类型错误
  }

  const MAX_STEPS = 6; // 最大允许步骤数
  const dp = new Map([[0, [[]]]]); // 使用数组存储路径步骤
  const visited = new Set();

  // 修正后的有效物品筛选逻辑
  const validItems = items.filter(
    (item) => Math.abs(item.item_value) > epsilon // 只排除零值物品，允许所有非零物品参与计算
  );

  console.log(
    "有效物品:",
    validItems.map((i) => `${i.item_name}(${i.item_value})`)
  );

  // 动态规划主逻辑
  for (const item of validItems) {
    console.log(`\n=== 开始处理物品 ${item.id} (${item.item_value}) ===`); // 增强日志
    console.log(`\n处理物品 ${item.id} (${item.item_value})`);

    const currentStates = Array.from(dp.entries());
    console.log(`当前DP状态数量: ${currentStates.length}`); // 新增状态监控

    for (const [currentSum, paths] of currentStates) {
      console.log(`当前状态 sum=${currentSum}, 路径数=${paths.length}`);

      // 动态计算最大使用次数
      const remaining = target - currentSum;

      const maxCount = Math.min(
        Math.ceil(Math.abs(remaining / item.item_value)) + 2,
        10 // 限制单物品最大使用次数，避免无限循环
      );

      // 放宽方向检查：允许任何方向物品（仅排除明显无效的）
      //const shouldAdd =
      //  Math.abs(item.item_value) <= Math.abs(remaining) + epsilon;

      //const shouldAdd = true; // 完全移除方向检查

      //if (!shouldAdd) continue;

      for (let count = 1; count <= maxCount; count++) {
        const newValue = item.item_value * count;
        const newSum = currentSum + newValue;

        // 改进后的精度检查
        const isExact = Math.abs(newSum - target) <= epsilon;

        /*const isApproaching =
          (item.item_value > 0 && newSum <= target + epsilon) ||
          (item.item_value < 0 && newSum >= target - epsilon);
*/

        // 修改为允许更宽松的接近条件
        const isApproaching =
          Math.abs(newSum - target) <=
          //Math.abs(currentSum - target) + epsilon * 10;
          Math.abs(currentSum - target) + 10;

          console.log(
            `Math1=${Math.abs(newSum - target)}, Math2=${
              Math.abs(currentSum - target) + 50
            }`,
          );
          console.log(
            `isExact=${isExact}, isApproaching=${isApproaching}`,
            `newSum=${newSum}, target=${target}, currentSum=${currentSum}`,
          );


     /*     const isApproaching = (newSum - target) * (currentSum - target) < 0
? true // 允许正负交替
: Math.abs(newSum - target) < Math.abs(currentSum - target) * 1.5; // 允许适度偏离*/

        if (!isExact && !isApproaching) continue;

        // 遍历现有路径
        for (const oldPath of paths) {
          // 生成新路径（保留原始顺序）
          const newPath = [...oldPath, { id: item.id, count }];

          if (isExact) {
            console.log(
              `发现精确解! sum=${newSum} 路径:`,
              newPath.map((s) => `${s.id}x${s.count}`).join("+")
            );
          }

          // 检查步骤限制
          if (newPath.length > MAX_STEPS) continue;

          // 路径去重（考虑顺序敏感）
          const pathKey = newPath
            .sort((a, b) => a.id - b.id) // 顺序无关去重
            .map((s) => `${s.id}x${s.count}`)
            .join("_");

          if (!visited.has(pathKey)) {
            visited.add(pathKey);

            if (!dp.has(newSum)) {
              dp.set(newSum, []);
            }

            // 智能排序：优先次数少、步骤少的路径
            dp.get(newSum).push(newPath);
            dp.get(newSum).sort((a, b) => {
              const stepDiff = a.length - b.length;
              if (stepDiff !== 0) return stepDiff;

              const totalCountDiff =
                a.reduce((sum, s) => sum + s.count, 0) -
                b.reduce((sum, s) => sum + s.count, 0);

              return (
                totalCountDiff ||
                Math.abs(
                  a.reduce(
                    (s, v) => s + v.count * getItemById(v.id).item_value,
                    0
                  ) - target
                ) -
                  Math.abs(
                    b.reduce(
                      (s, v) => s + v.count * getItemById(v.id).item_value,
                      0
                    ) - target
                  )
              );
            });
          }
        }
      }
    }
  }

  console.log(
    "预处理结果:",
    Array.from(dp.entries()).map(([k, v]) => `${k}:${v.length}条`)
  );

  // 改进结果处理
  const result = Array.from(dp.entries())
    .filter(([sum]) => Math.abs(sum - target) <= epsilon)
    .flatMap(([_, paths]) =>
      paths.map((path) => {
        // 保持原始顺序的合并
        const merged = [];
        const seen = new Map();

        for (const step of path) {
          if (seen.has(step.id)) {
            seen.get(step.id).count += step.count;
          } else {
            const newStep = { ...step };
            seen.set(step.id, newStep);
            merged.push(newStep);
          }
        }
        return merged;
      })
    )
    .filter((p) => p.length > 0) // 过滤空路径
    .sort((a, b) => {
      const stepDiff = a.length - b.length;
      if (stepDiff !== 0) return stepDiff;

      const countDiff =
        a.reduce((sum, s) => sum + s.count, 0) -
        b.reduce((sum, s) => sum + s.count, 0);

      return (
        countDiff ||
        a
          .map((s) => s.id)
          .join()
          .localeCompare(b.map((s) => s.id).join())
      );
    });
  // 新增调试点4：最终结果检查
  console.log(
    "过滤后结果:",
    result.map((p) => p.map((s) => `${s.id}x${s.count}`).join("+"))
  );

  console.log("最终路径结果:", result);
  return result.length > 0 ? result : [];
};
