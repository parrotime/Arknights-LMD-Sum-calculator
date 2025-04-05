import { classifyData } from "../DataService";
//import Worker from "./worker.js"; // ʹ�� worker-loader
import {
  getMaxCountForId,
  getOptimalTradeGoldCombo,
  getOptimalMaterialCombo,
  getOptimalStageCombo,
  //mergeAndSortPath,
  isPathValid,
} from "./utils.js";
// ȫ�ֺ�������ȡ��Ʒ���ʹ�ô���

const stageIds = [
  87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 107, 108, 109, 110, 111, 112,
  113, 114, 210, 211,
]; // �������Ĺؿ�

export const findPaths = async (
  target,
  items = classifyData,
  epsilon = 1e-6
) => {
  console.log("����Ŀ���ֵ:", target);
  console.log("ԭʼ items ����:", items);
  // ������֤
  if (typeof target !== "number" || !Array.isArray(items)) {
    console.log("������֤ʧ��: target =", target, "items =", items);
    return [];
  }

  // ��������
  const MAX_STEPS = 6; // ���������
  const MAX_PATHS_PER_SUM = 10; // �����������ʹ�ô���
  const TARGET_PATH_COUNT = 10;

  const tradeGoldIds = [117, 118, 119]; // ���� 2��3��4 ����� (1000, 1500, 2000)
  const materialIds = [100, 101, 102, 103]; // �����ϳ� (-100, -200, -300, -400)

  // ��ʼ�� DP Map ����Ч��Ʒ
  const dp = new Map([[0, [[]]]]);
  const validItems = items.filter(
    (item) =>
      typeof item?.item_value === "number" &&
      Math.abs(item.item_value) > epsilon
  );

  console.log(
    "��Ч��Ʒ:",
    validItems.map((i) => `${i.item_name}(${i.item_value})`)
  );

  // ������ֵ�Ӵ�С������Ʒ
  const sortedItems = [...validItems].sort(
    (a, b) => Math.abs(b.item_value) - Math.abs(a.item_value)
  );

  // ��һ�׶Σ�����·��
  for (const item of sortedItems) {
    const itemValue = item.item_value;
    const maxCount = getMaxCountForId(item.id, items);

    console.log(
      `Item: ${item.id}, itemValue: ${itemValue}, maxCount: ${maxCount}`
    );

    let count = 0;

    while (
      count < maxCount &&
      Math.abs(itemValue * (count + 1) - target) <= Math.abs(target)
    ) {
      count++;
      const newSum = itemValue * count;
      //if (Math.abs(newSum) > Math.abs(target) * 2) break; // �������ɹ���� sum
      let newPath;

      if (tradeGoldIds.includes(item.id)) {
        const { combo } = getOptimalTradeGoldCombo(newSum);
        if (combo.length > 0) newPath = combo;
        else continue;
      } else if (materialIds.includes(item.id)) {
        const { combo } = getOptimalMaterialCombo(newSum);
        if (combo.length > 0) newPath = combo;
        else continue;
      } else if (stageIds.includes(item.id)) {
        const { combo } = getOptimalStageCombo(newSum, items, stageIds);
        if (combo.length > 0) newPath = combo;
        else continue;
      } else {
        newPath = [{ id: item.id, count }];
      }

      if (!savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon)) {
        console.log(
          `����·��ʧ��: sum=${newSum}, path=${JSON.stringify(newPath)}`
        );
      }
    }
  }

  console.log("��һ�׶���ɺ� dp:", Array.from(dp.entries()));

  // �ڶ��׶Σ��ಽ·��

  const startTime = performance.now();

  /*
  const workerCount = 2; // ʹ�� CPU ������

  
  const workers = Array.from(
    { length: workerCount },
    () => new Worker()
  );
  const promises = [];*/

  for (let step = 2; step <= MAX_STEPS; step++) {
    const currentStates = Array.from(dp.entries());

    if (
      dp.size === 1 &&
      dp.has(0) &&
      dp.get(0).length === 1 &&
      dp.get(0)[0].length === 0
    ) {
      console.log("��һ�׶�δ�����κ�·����ֱ�ӷ���");
      return finalizeResult(dp, target, MAX_PATHS_PER_SUM, items);
    }

    if (!Array.isArray(currentStates)) {
      console.error("currentStates ��������:", currentStates);
      continue;
    }

    if (currentStates.length === 0) {
      console.log("Step:", step, "currentStates Ϊ�գ������˲�");
      continue;
    }

    const results = [];
    for (const [currentSum, paths] of currentStates) {
      if (Math.abs(currentSum - target) > 3000) continue;

      for (const item of sortedItems) {
        const itemValue = item.item_value;
        const maxCount = getMaxCountForId(item.id, items);
        let count = 0;

        while (
          count < maxCount &&
          Math.abs(currentSum + itemValue * (count + 1) - target) <=
            Math.abs(target) + Math.abs(itemValue)
        ) {
          count++;
          const newSum = currentSum + itemValue * count;

          // ��֦����� newSum ƫ�� target ���࣬����
          //if (Math.abs(newSum - target) > Math.abs(target) * 2) continue;
          if (
            Math.abs(newSum - target) >
            Math.abs(target) + Math.abs(itemValue)
          )
            continue;

          for (const oldPath of paths) {
            let newPath;
            if (tradeGoldIds.includes(item.id)) {
              const tradeSum = itemValue * count;
              const { combo } = getOptimalTradeGoldCombo(tradeSum);
              if (combo.length === 0) continue;
              newPath = [...oldPath, ...combo];
            } else if (materialIds.includes(item.id)) {
              const materialSum = itemValue * count;
              const { combo } = getOptimalMaterialCombo(materialSum);
              if (combo.length === 0) continue;
              newPath = [...oldPath, ...combo];
            } else if (stageIds.includes(item.id)) {
              const stageSum = itemValue * count;
              const { combo } = getOptimalStageCombo(stageSum, items, stageIds);
              if (combo.length === 0) continue;
              newPath = [...oldPath, ...combo];
            } else {
              newPath = mergeAndSortPath(oldPath, { id: item.id, count });
            }

            if (isPathValid(newPath, items)) {
              //console.log("����·��:", newSum, newPath);
              results.push({ sum: newSum, paths: [newPath] });
            }
          }
        }
      }
    }

    // �ϲ������ dp
    results.forEach(({ sum, paths }) => {
      if (!dp.has(sum)) dp.set(sum, []);
      const existingPaths = dp.get(sum);
      paths.forEach((path) => {
        if (isPathValid(path, items)) {
          const pathKey = path.map((s) => `${s.id}x${s.count}`).join("_");
          if (
            existingPaths.length < MAX_PATHS_PER_SUM &&
            !existingPaths.some(
              (p) => p.map((s) => `${s.id}x${s.count}`).join("_") === pathKey
            )
          ) {
            existingPaths.push(path);
          }
        }
      });
    });

    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= TARGET_PATH_COUNT) {
      break;
    }
  }

  console.log("���м����ʱ:", performance.now() - startTime, "ms");

  /*

    const chunkSize = Math.ceil(currentStates.length / workerCount);
    const chunks = [];

    // ��ӵ�����־
    //console.log("Step:", step, "currentStates:", JSON.stringify(currentStates));

    // �� currentStates ��Ƭ
    for (let i = 0; i < currentStates.length; i += chunkSize) {
      const chunk = currentStates.slice(i, i + chunkSize);
      if (!Array.isArray(chunk)) {
        console.error("���� chunk ʧ��:", chunk);
        continue;
      }
      chunks.push(chunk);
    }

    console.log("Step:", step, "״̬����:", currentStates.length, "��Ƭ����:", chunks.length);
    console.log("chunks:", JSON.stringify(chunks));



  // ��� chunks �е� undefined
    const invalidChunks = chunks.filter(chunk => !Array.isArray(chunk));
    if (invalidChunks.length > 0) {
      console.error("������Ч chunk:", invalidChunks);
      continue; // ������һ��
    }

    if (chunks.length === 0) {
      console.log("chunks Ϊ�գ����� Worker ����");
      continue;
    }




    //promises.length = 0; // �����һ�� promises
    // ���� Worker ����������
    chunks.forEach((chunk, idx) => {
      const worker = workers[idx % workerCount];
      //workers.push(worker);

  /*if (!Array.isArray(chunk)) {
    console.error(`Worker ${idx} �յ���Ч chunk:`, chunk);
    return;
  }
  if (chunk.length === 0) {
    console.log(`Worker ${idx} �յ��� chunk������`);
    return;
  }
  // ȷ�� chunk �е�ÿ��Ԫ���� [sum, paths] ��ʽ
  const isValidChunk = chunk.every(
    ([sum, paths]) => typeof sum === "number" && Array.isArray(paths)
  );
  if (!isValidChunk) {
    console.error(`Worker ${idx} �յ���ʽ����� chunk:`, chunk);
    return;
  }

      const promise = new Promise((resolve) => {
        worker.onmessage = (e) => {
          if (e.data.debug) console.log(e.data.debug); // ���������Ϣ
          else resolve(e.data.results); // ������
        };
      });
      promises.push(promise);

      // ȷ�� chunk ������
      if (!Array.isArray(chunk)) {
        console.error(`Worker ${idx} �յ���Ч chunk:`, chunk);
        return;
      }

      worker.postMessage({
        task: chunk,
        sortedItems,
        target,
        pruneThreshold: 3000,
        tradeGoldIds,
        materialIds,
        stageIds,
        items,
      });
    });

    // �ȴ����� worker ���
    const workerResults = await Promise.all(promises);

    // �ϲ������ dp
    workerResults.forEach((result) => {
      result.forEach(({ sum, paths }) => {
        if (!dp.has(sum)) dp.set(sum, []);
        const existingPaths = dp.get(sum);
        paths.forEach((path) => {
          if(isPathValid(path, items)){
            
            const pathKey = path.map((s) => `${s.id}x${s.count}`).join("_");
            if (
              existingPaths.length < MAX_PATHS_PER_SUM &&
              !existingPaths.some(
                (p) => p.map((s) => `${s.id}x${s.count}`).join("_") === pathKey
              )
            ) {
              existingPaths.push(path);
            }
          }
        });
      });
    });

    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= TARGET_PATH_COUNT) {
      break;
    }
  }

  //const workerResults = await Promise.all(promises);
  console.log("���м����ʱ:", performance.now() - startTime, "ms");
  // ���� workers
  workers.forEach((worker) => worker.terminate());
*/

  return finalizeResult(dp, target, MAX_PATHS_PER_SUM, items);
};

// ��������������·������龫ȷ��
function savePath(dp, sum, path, maxPaths, target, epsilon) {
  const pathKey = path.map((s) => `${s.id}x${s.count}`).join("_");

  if (!dp.has(sum)) dp.set(sum, []);
  const existingPaths = dp.get(sum);

  if (
    existingPaths.length < maxPaths &&
    !existingPaths.some(
      (p) => p.map((s) => `${s.id}x${s.count}`).join("_") === pathKey
    )
  ) {
    existingPaths.push(path);
    //console.log(`����·��: ${sum} -> ${pathKey}`);

    if (Math.abs(sum - target) <= epsilon) {
      console.log(`���־�ȷ��! sum=${sum}, ·��: ${pathKey}`);
    }
    return true;
  }
  return false;
}

// ���������������������ս��
function finalizeResult(dp, target, maxPaths, items) {
  let result = dp.get(target) || [];

  //const result = dp.get(target) || [];
  const uniquePaths = new Set();

  // �������ǹؿ��ļ�ֵӳ��
  const stageValueMap = new Map([
    [110, 432],
    [114, 360],
    [109, 360],
    [113, 300],
    [108, 300],
    [112, 250],
    [92, 252],
    [98, 210],
    [107, 240],
    [111, 200],
    [91, 216],
    [97, 180],
    [90, 180],
    [96, 150],
    [210, 144],
    [211, 120],
    [89, 120],
    [95, 100],
    [88, 108],
    [94, 90],
    [87, 72],
    [93, 60],
  ]);

  const optimizedPaths = result.map((path) => {
    const stageSteps = path.filter((step) => stageValueMap.has(step.id));
    const nonStageSteps = path.filter((step) => !stageValueMap.has(step.id));

    if (stageSteps.length === 0) return path;

    // �������ǹؿ����ܼ�ֵ
    let totalStageValue = 0;
    for (const step of stageSteps) {
      totalStageValue += (stageValueMap.get(step.id) || 0) * step.count;
    }

    // ʹ�� getOptimalStageCombo ���¼�����������·��
    const { combo } = getOptimalStageCombo(totalStageValue, items, stageIds);
    if (combo.length === 0) return path; // ����޷��Ż�������ԭ·��

    // ���ʹ�ô�������
    const idCountMap = new Map();
    for (const step of [...nonStageSteps, ...combo]) {
      idCountMap.set(step.id, (idCountMap.get(step.id) || 0) + step.count);
      const maxCount = getMaxCountForId(step.id, items);
      if (idCountMap.get(step.id) > maxCount) return path; // ������ޣ�����ԭ·��
    }

    // �ϲ��Ż��������·���ͷ�����·��
    return [...nonStageSteps, ...combo];
  });

  const finalResult = optimizedPaths
    .map((path) => {
      const key = path.map((s) => `${s.id}x${s.count}`).join("_");
      if (uniquePaths.has(key)) return null;
      uniquePaths.add(key);
      return path;
    })
    .filter(Boolean)
    .sort((a, b) => {
      // ���Ȱ�·���������򣨲��������٣�
      const lengthDiff = a.length - b.length;
      if (lengthDiff !== 0) return lengthDiff;
      // ���������ͬ������ʹ�ô�������

      const totalCountA = a.reduce((sum, step) => sum + step.count, 0);
      const totalCountB = b.reduce((sum, step) => sum + step.count, 0);
      return (
        totalCountA - totalCountB || a.length - b.length || a[0].id - b[0].id
      );
    })
    .slice(0, maxPaths);

  console.log("���շ��ؽ��:", finalResult);
  return finalResult;
}

function mergeAndSortPath(oldPath, newStep) {
  const path = [...oldPath, newStep];
  // �� id ����
  path.sort((a, b) => a.id - b.id);
  // �ϲ���ͬ id �Ĳ���
  const merged = [];
  for (const step of path) {
    if (merged.length > 0 && merged[merged.length - 1].id === step.id) {
      merged[merged.length - 1].count += step.count;
    } else {
      merged.push({ ...step });
    }
  }
  return merged;
}
