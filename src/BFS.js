// 表格数据
const tableData = [
  [0, 1, 1, 1, 1, null],
  [1, -718, -333, -125, -61, null],
  [5, -775, -367, -141, -69, null],
  [10, -848, -408, -159, -79, null],
  [15, -1022, -462, -177, -88, null],
  [20, -1394, -654, -251, -122, null],
  [25, -1747, -836, -324, -162, null],
  [30, -2116, -1026, -404, -202, null],
  [35, -2507, -1226, -484, -242, null],
  [40, -2891, -1420, -564, -282, null],
  [45, -3283, -1617, -644, -322, null]
];

// 从表格中提取所有有效的数值
const extractNumbers = () => {
  const numbers = new Set();
  for (let i = 1; i < tableData.length; i++) {
    for (let j = 1; j < tableData[i].length; j++) {
      const value = tableData[i][j];
      if (value !== null) {
        numbers.add(value);
      }
    }
  }
  return Array.from(numbers);
};

// 查找能够组合出目标差值的最短路径
export const findShortestPath = (target) => {
  const numbers = extractNumbers(); // 获取表格中的所有有效数值
  const queue = [[0, []]]; // 队列存储 (current_sum, path)
  const visited = new Set(); // 记录已经访问过的 current_sum

  while (queue.length > 0) {
    const [currentSum, path] = queue.shift();

    // 如果当前和等于目标差值，返回路径
    if (currentSum === target) {
      return path;
    }

    // 如果路径步数超过 15 步，停止搜索
    if (path.length >= 15) {
      return null; // 返回 null 表示步数过多
    }

    // 遍历所有数值，尝试组合
    for (const number of numbers) {
      const newSum = currentSum + number;
      if (!visited.has(newSum)) {
        visited.add(newSum);
        queue.push([newSum, [...path, number]]);
      }
    }
  }

  // 如果没有找到组合，返回 null
  return null;
};