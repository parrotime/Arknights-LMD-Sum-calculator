//版本1，路径计算速度慢，但似乎是没有重复路径？
// eslint-disable-next-line no-unused-vars
import { classifyData, getItemById } from "../DataService";

export const findPaths = (target, items, epsilon = 1e-6) => {
  console.log("璁＄畻鐩爣宸€�:", target);

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
    "鏈夋晥鐗╁搧:",
    validItems.map((i) => `${i.item_name}(${i.item_value})`)
  );

  // 绗竴闃舵锛氬崟姝ヨ矾寰�
  for (const item of validItems) {
    const itemValue = item.item_value;
    let newSum = 0;
    let count = 0;

    while (
      count <= 5 && // 闄愬埗鍗曚竴鐗╁搧浣跨敤娆℃暟锛岄伩鍏嶅崟涓€瑙ｉ湼鍗�
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
        console.log(`鍗曟淇濆瓨璺緞: ${newSum} -> ${pathKey}`);
      }

      if (Math.abs(newSum - target) <= epsilon) {
        console.log(`鍙戠幇绮剧‘瑙�! sum=${newSum}, 璺緞: ${pathKey}`);
      }
    }
  }

  // 绗簩闃舵锛氬姝ヨ矾寰�
  for (let step = 2; step <= MAX_STEPS; step++) {
    for (const item of validItems) {
      const itemValue = item.item_value;
      const currentStates = Array.from(dp.entries());

      for (const [currentSum, paths] of currentStates) {
        let newSum = currentSum;
        let count = 0;

        while (
          count <= 5 && // 闄愬埗鍗曚竴鐗╁搧閲嶅娆℃暟
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
              const newPath = [...oldPath, { id: item.id, count }]; // 鐩存帴娣诲姞鏂伴」锛岄伩鍏嶅悎骞朵涪澶卞鏍锋€�
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
                console.log(`澶氭淇濆瓨璺緞: ${newSum} -> ${pathKey}`);
              } else if (existingPaths.length >= MAX_PATHS_PER_SUM) {
                existingPaths.push(newPath);
                existingPaths.sort(
                  (a, b) => a.length - b.length || a[0].id - b[0].id
                );
                existingPaths.splice(MAX_PATHS_PER_SUM);
              }

              if (Math.abs(newSum - target) <= epsilon) {
                console.log(`鍙戠幇绮剧‘瑙�! sum=${newSum}, 璺緞: ${pathKey}`);
              }
            }
          }
        }
      }
    }

    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= MAX_PATHS_PER_SUM) break; // 璋冩暣涓烘洿瀹芥澗鐨勭粓姝㈡潯浠�
  }

  // 杩斿洖缁撴灉
  const result = dp.get(target) || [];

  console.log("dp.get(target) 瀹屾暣鍐呭:", result);
  console.log(
    "dp.get(target) 鍘熷璺緞:",
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

  console.log("鍘婚噸鍚庣殑璺緞闆嗗悎:", Array.from(uniquePaths));
  console.log("鏈€缁堣繑鍥炵粨鏋�:", finalResult);

  return finalResult;
};
