
// BFS.js
import { classifyData } from './DataService';

const createPathKey = (path) => {
  const counts = new Map();
  path.forEach(item => {
    counts.set(item.id, (counts.get(item.id) || 0) + 1)
  });
  return Array.from(counts.entries()).sort().toString();
};

export const findPath = (target) => {
  const validItems = classifyData.filter(d => d.item_value !== 0);
  const queue = [[0, [], new Map()]]; // [currentSum, path, itemCounts]
  const visited = new Set();
  const candidates = [];
  
  while (queue.length > 0) {
    const [sum, path, countMap] = queue.shift();
    
    // 结果收集条件
    if (sum === target) {
      candidates.push(path);
      if (candidates.length >=5) break;
      continue;
    }

    // 剪枝条件
    if (path.length >=15 || Math.abs(target - sum) > 5000) continue;

    // 遍历所有合法物品
    for (const item of validItems) {
      const newSum = sum + item.item_value;
      const newCount = (countMap.get(item.id) || 0) + 1;
      
      // 有效性校验
      if (newSum * target < 0) continue; // 防止反向增长
      
      // 生成新路径标识
      const newCountMap = new Map(countMap).set(item.id, newCount);
      const pathKey = `${item.id}:${newCount}`;
      
      if (!visited.has(pathKey)) {
        visited.add(pathKey);
        queue.push([
          newSum,
          [...path, item], 
          newCountMap
        ]);
      }
    }
    
    // 动态排序队列（优先接近目标值）
    queue.sort((a,b) => 
      Math.abs(target - a[0]) - Math.abs(target - b[0]) || 
      a[1].length - b[1].length
    );
  }

  return candidates;
};

