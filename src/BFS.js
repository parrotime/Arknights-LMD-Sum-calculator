// �������
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

// �ӱ������ȡ������Ч����ֵ
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

// �����ܹ���ϳ�Ŀ���ֵ�����·��
export const findShortestPath = (target) => {
  const numbers = extractNumbers(); // ��ȡ����е�������Ч��ֵ
  const queue = [[0, []]]; // ���д洢 (current_sum, path)
  const visited = new Set(); // ��¼�Ѿ����ʹ��� current_sum

  while (queue.length > 0) {
    const [currentSum, path] = queue.shift();

    // �����ǰ�͵���Ŀ���ֵ������·��
    if (currentSum === target) {
      return path;
    }

    // ���·���������� 15 ����ֹͣ����
    if (path.length >= 15) {
      return null; // ���� null ��ʾ��������
    }

    // ����������ֵ���������
    for (const number of numbers) {
      const newSum = currentSum + number;
      if (!visited.has(newSum)) {
        visited.add(newSum);
        queue.push([newSum, [...path, number]]);
      }
    }
  }

  // ���û���ҵ���ϣ����� null
  return null;
};