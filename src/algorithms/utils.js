// utils.js
export function getMaxCountForId(id, items){
  const item = items.find((i) => i.id === id);
  if (item?.type === "upgrade") return 1;
  if ([1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 51, 52].includes(id))
    return 1;
  if (id >= 150 && id <= 180) return 5;
  if (id >= 181 && id <= 209) return 3;
  if (id === 106) return 5;
  return 10; // MAX_ITEM_USE_COUNT
}

export function getOptimalTradeGoldCombo(subTarget) {
  if (subTarget < 0) return { steps: Infinity, combo: [] };
  let remaining = subTarget;
  let steps = 0;
  let combo = [];
  const count2000 = Math.floor(remaining / 2000);
  if (count2000 > 0) {
    combo.push({ id: 119, count: count2000 });
    remaining -= count2000 * 2000;
    steps += count2000;
  }
  const count1500 = Math.floor(remaining / 1500);
  if (count1500 > 0) {
    combo.push({ id: 118, count: count1500 });
    remaining -= count1500 * 1500;
    steps += count1500;
  }
  const count1000 = Math.floor(remaining / 1000);
  if (count1000 > 0) {
    combo.push({ id: 117, count: count1000 });
    remaining -= count1000 * 1000;
    steps += count1000;
  }
  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
}

export function getOptimalMaterialCombo(subTarget) {
  if (subTarget > 0) return { steps: Infinity, combo: [] };
  let remaining = Math.abs(subTarget);
  let steps = 0;
  let combo = [];
  const count400 = Math.floor(remaining / 400);
  if (count400 > 0) {
    combo.push({ id: 103, count: count400 });
    remaining -= count400 * 400;
    steps += count400;
  }
  const count300 = Math.floor(remaining / 300);
  if (count300 > 0) {
    combo.push({ id: 102, count: count300 });
    remaining -= count300 * 300;
    steps += count300;
  }
  const count200 = Math.floor(remaining / 200);
  if (count200 > 0) {
    combo.push({ id: 101, count: count200 });
    remaining -= count200 * 200;
    steps += count200;
  }
  const count100 = Math.floor(remaining / 100);
  if (count100 > 0) {
    combo.push({ id: 100, count: count100 });
    remaining -= count100 * 100;
    steps += count100;
  }
  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
}

export function getOptimalStageCombo(subTarget, availableItems, stageIds) {
  if (subTarget < 0) return { steps: Infinity, combo: [] };
  let remaining = subTarget;
  let steps = 0;
  let combo = [];

  const stageValues = availableItems
    .filter((item) => stageIds.includes(item.id))
    .map((item) => ({ id: item.id, value: item.item_value }))
    .sort((a, b) => b.value - a.value);

  for (const { id, value } of stageValues) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      combo.push({ id, count });
      remaining -= count * value;
      steps += count;
    }
  }

  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
}

export function mergeAndSortPath(oldPath, newStep) {
  const pathMap = new Map(oldPath.map((step) => [step.id, step.count]));
  pathMap.set(newStep.id, (pathMap.get(newStep.id) || 0) + newStep.count);
  return Array.from(pathMap.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id - b.id);
}

export function isPathValid(path, items) {
  const idCountMap = new Map();
  for (const step of path) {
    const currentCount = idCountMap.get(step.id) || 0;
    idCountMap.set(step.id, currentCount + step.count);
    const maxCount = getMaxCountForId(step.id, items);
    if (idCountMap.get(step.id) > maxCount) return false;
  }
  return true;
}
