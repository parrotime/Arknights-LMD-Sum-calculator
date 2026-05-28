import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { writeFileSync } from 'fs';

const LOG_FILE = 'D:\\Project 2025\\arknights calculator\\main\\backend-out (4).log';
const START_DATE = new Date('2025-04-19');
const END_DATE = new Date('2026-02-12');
const DAYS = Math.ceil((END_DATE - START_DATE) / (1000 * 60 * 60 * 24));

const stats = {
  totalRequests: 0,
  targetDistribution: {},
  limitCombinations: {},
  timeDistribution: {},
  itemsLengthDistribution: {},
  uniqueIPs: new Set(),
  cacheHits: 0,
  cacheMisses: 0,
  emptyResults: 0,
  goalDistribution: {},
  exactGoalDistribution: {}
};

function getLimitKey(limits) {
  const { upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit } = limits;

  // 识别4个主要类型
  if (sanityLimit === 0) return 'nosanity';
  if (sanityLimit === 36) return 'sanity36';
  if (upgrade0Limit === 0 && upgrade1Limit === 0 && upgrade2Limit === 0) return 'noupgrade';
  if (!upgrade0Limit && !upgrade1Limit && !upgrade2Limit && !sanityLimit) return 'none';

  // 其他组合
  return JSON.stringify({ upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit });
}

function parseRequestLine(line) {
  // 格式1: [2026/2/12 10:54:48] Goal(用户想凑) = 5201002 Diff(差值): target = 2 items length = 125 limits = {
  const goalMatch = line.match(/\[([^\]]+)\] Goal\(用户想凑\) = (\d+) Diff\(差值\): target = (-?\d+) items length = (\d+) limits = \{/);
  if (goalMatch) {
    return {
      timestamp: goalMatch[1],
      goal: parseInt(goalMatch[2]),
      target: parseInt(goalMatch[3]),
      itemsLength: parseInt(goalMatch[4]),
      hasGoal: true
    };
  }

  // 格式2: [2026/1/10 13:02:43] 后端接收请求 (Validated): target = -51 items length = 119 limits = {
  const timestampMatch = line.match(/\[([^\]]+)\] 后端接收请求 \(Validated\): target = (-?\d+) items length = (\d+) limits = \{/);
  if (timestampMatch) {
    return {
      timestamp: timestampMatch[1],
      target: parseInt(timestampMatch[2]),
      itemsLength: parseInt(timestampMatch[3]),
      hasGoal: false
    };
  }

  // 格式3: 后端接收请求 (Validated): target = -111 items length = 199 limits = {
  const noTimestampMatch = line.match(/后端接收请求 \(Validated\): target = (-?\d+) items length = (\d+) limits = \{/);
  if (noTimestampMatch) {
    return {
      target: parseInt(noTimestampMatch[1]),
      itemsLength: parseInt(noTimestampMatch[2]),
      hasGoal: false
    };
  }

  return null;
}

async function processLog() {
  const rl = createInterface({ input: createReadStream(LOG_FILE) });
  let currentRequest = null;
  let currentLimits = null;
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 100000 === 0) console.log(`已处理 ${lineCount} 行...`);

    // 解析请求行
    const request = parseRequestLine(line);
    if (request) {
      currentRequest = request;
      currentLimits = {};
      stats.totalRequests++;

      // target分布
      const targetBucket = Math.floor(request.target / 100) * 100;
      stats.targetDistribution[targetBucket] = (stats.targetDistribution[targetBucket] || 0) + 1;

      // items length分布
      stats.itemsLengthDistribution[request.itemsLength] = (stats.itemsLengthDistribution[request.itemsLength] || 0) + 1;

      // goal分布
      if (request.hasGoal && request.goal) {
        const goalBucket = Math.floor(request.goal / 1000) * 1000;
        stats.goalDistribution[goalBucket] = (stats.goalDistribution[goalBucket] || 0) + 1;
        stats.exactGoalDistribution[request.goal] = (stats.exactGoalDistribution[request.goal] || 0) + 1;
      }

      // 时间分布
      if (request.timestamp) {
        const hour = request.timestamp.split(' ')[1]?.split(':')[0];
        if (hour) stats.timeDistribution[hour] = (stats.timeDistribution[hour] || 0) + 1;
      }
      continue;
    }

    // 解析limits（多行格式）
    if (currentRequest && currentLimits !== null) {
      if (line.includes('upgrade0Limit:')) {
        const match = line.match(/upgrade0Limit:\s*(\w+)/);
        if (match) currentLimits.upgrade0Limit = match[1] === 'null' ? null : parseInt(match[1]);
      }
      if (line.includes('upgrade1Limit:')) {
        const match = line.match(/upgrade1Limit:\s*(\w+)/);
        if (match) currentLimits.upgrade1Limit = match[1] === 'null' ? null : parseInt(match[1]);
      }
      if (line.includes('upgrade2Limit:')) {
        const match = line.match(/upgrade2Limit:\s*(\w+)/);
        if (match) currentLimits.upgrade2Limit = match[1] === 'null' ? null : parseInt(match[1]);
      }
      if (line.includes('sanityLimit:')) {
        const match = line.match(/sanityLimit:\s*(\w+)/);
        if (match) {
          currentLimits.sanityLimit = match[1] === 'null' ? null : parseInt(match[1]);
          const key = getLimitKey(currentLimits);
          stats.limitCombinations[key] = (stats.limitCombinations[key] || 0) + 1;
          currentLimits = null;
        }
      }
    }

    // IP地址
    if (line.includes('Rate limit check for IP:')) {
      const ipMatch = line.match(/Rate limit check for IP: (.+)/);
      if (ipMatch) stats.uniqueIPs.add(ipMatch[1].trim());
    }

    // Cache状态
    if (line.includes('Cache miss')) stats.cacheMisses++;
    if (line.includes('Result stored in cache')) stats.cacheHits++;
    if (line.includes('Calculation resulted in empty')) stats.emptyResults++;
  }

  console.log(`\n处理完成！总行数: ${lineCount}`);
}

function generateReport() {
  const avgDaily = (stats.totalRequests / DAYS).toFixed(2);
  const cacheTotal = stats.cacheHits + stats.cacheMisses;
  const cacheHitRate = cacheTotal > 0 ? ((stats.cacheHits / cacheTotal) * 100).toFixed(2) : 0;

  let report = `日志分析报告
==================
分析时间: ${new Date().toLocaleString('zh-CN')}
日志文件: backend-out (4).log
时间范围: 2025-04-19 至 2026-02-12 (${DAYS}天)

总体统计
-----------
总请求数: ${stats.totalRequests.toLocaleString()}
日均请求: ${avgDaily}
独立IP数: ${stats.uniqueIPs.size.toLocaleString()}
空结果数: ${stats.emptyResults}

缓存统计
-----------
Cache Hits: ${stats.cacheHits.toLocaleString()}
Cache Misses: ${stats.cacheMisses.toLocaleString()}
命中率: ${cacheHitRate}%

`;

  // Target分布 (Top 20)
  report += `\nTarget值分布 (Top 20区间)\n${'-'.repeat(50)}\n`;
  const sortedTargets = Object.entries(stats.targetDistribution).sort((a, b) => b[1] - a[1]).slice(0, 20);
  sortedTargets.forEach(([bucket, count]) => {
    const pct = ((count / stats.totalRequests) * 100).toFixed(2);
    report += `[${bucket}, ${parseInt(bucket) + 99}]: ${count.toLocaleString()} (${pct}%)\n`;
  });

  // 限制组合频率
  report += `\n\n限制组合频率 (Top 15)\n${'-'.repeat(50)}\n`;
  const sortedLimits = Object.entries(stats.limitCombinations).sort((a, b) => b[1] - a[1]).slice(0, 15);
  let tier1Total = 0;
  sortedLimits.forEach(([key, count], idx) => {
    const pct = ((count / stats.totalRequests) * 100).toFixed(2);
    const isTier1 = ['none', 'nosanity', 'sanity36', 'noupgrade'].includes(key);
    if (isTier1) tier1Total += count;
    report += `${idx + 1}. ${key}: ${count.toLocaleString()} (${pct}%)${isTier1 ? ' [Tier 1]' : ''}\n`;
  });
  const tier1Pct = ((tier1Total / stats.totalRequests) * 100).toFixed(2);
  report += `\nTier 1覆盖率: ${tier1Total.toLocaleString()} (${tier1Pct}%)\n`;

  // Goal精确值 Top 10
  report += `\n\nGoal值频率 (Top 10)\n${'-'.repeat(50)}\n`;
  const sortedGoals = Object.entries(stats.exactGoalDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10);
  sortedGoals.forEach(([goal, count], idx) => {
    const pct = ((count / stats.totalRequests) * 100).toFixed(2);
    report += `${idx + 1}. ${goal}: ${count.toLocaleString()} (${pct}%)\n`;
  });

  return report;
}

processLog().then(() => {
  const report = generateReport();
  console.log('\n' + report);
  writeFileSync('D:\\Project 2025\\arknights calculator\\main\\backend\\_log_analysis\\analysis_report.txt', report);

  // 保存详细数据
  const detailData = {
    summary: {
      totalRequests: stats.totalRequests,
      avgDaily: (stats.totalRequests / DAYS).toFixed(2),
      uniqueIPs: stats.uniqueIPs.size,
      days: DAYS
    },
    targetDistribution: stats.targetDistribution,
    limitCombinations: stats.limitCombinations,
    timeDistribution: stats.timeDistribution,
    itemsLengthDistribution: stats.itemsLengthDistribution,
    goalDistribution: stats.goalDistribution
  };
  writeFileSync('D:\\Project 2025\\arknights calculator\\main\\backend\\_log_analysis\\analysis_data.json', JSON.stringify(detailData, null, 2));

  console.log('\n报告已保存到: _log_analysis/analysis_report.txt');
  console.log('详细数据已保存到: _log_analysis/analysis_data.json');
}).catch(console.error);
