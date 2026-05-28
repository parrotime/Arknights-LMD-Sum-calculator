import { findPaths } from '../DPnew.js';
import { classifyData } from '../DataService.js';
import { writeFileSync } from 'fs';

// 配置
const TARGET_RANGE = { min: -5000, max: 5000, step: 100 };
const LIMITS_CONFIGS = [
  { name: 'none', upgrade0Limit: null, upgrade1Limit: null, upgrade2Limit: null, sanityLimit: null },
  { name: 'nosanity', upgrade0Limit: null, upgrade1Limit: null, upgrade2Limit: null, sanityLimit: 0 },
  { name: 'noupgrade', upgrade0Limit: 0, upgrade1Limit: 0, upgrade2Limit: 0, sanityLimit: null },
  { name: 'combo_10_10_10_200', upgrade0Limit: 10, upgrade1Limit: 10, upgrade2Limit: 10, sanityLimit: 200 },
  { name: 'combo_10_10_10_100', upgrade0Limit: 10, upgrade1Limit: 10, upgrade2Limit: 10, sanityLimit: 100 },
  { name: 'combo_10_10_10_10', upgrade0Limit: 10, upgrade1Limit: 10, upgrade2Limit: 10, sanityLimit: 10 },
  { name: 'combo_10_10_10_null', upgrade0Limit: 10, upgrade1Limit: 10, upgrade2Limit: 10, sanityLimit: null }
];

// 生成任务列表
function generateTasks() {
  const tasks = [];
  for (let target = TARGET_RANGE.min; target <= TARGET_RANGE.max; target += TARGET_RANGE.step) {
    for (const limits of LIMITS_CONFIGS) {
      tasks.push({ target, limits });
    }
  }
  return tasks;
}

// 生成cache key
function getCacheKey(target, limits) {
  return `target_${target}_${limits.name}`;
}

// 主函数
async function precompute() {
  console.log('开始预计算...\n');
  console.log(`Items数据: ${classifyData.length}个物品`);

  const tasks = generateTasks();
  const totalTasks = tasks.length;
  console.log(`总任务数: ${totalTasks}`);
  console.log(`预计时间: ${(totalTasks * 5 / 60).toFixed(1)} 分钟（假设每任务5秒）\n`);

  const cache = {};
  const startTime = Date.now();
  let completed = 0;
  let failed = 0;

  for (const { target, limits } of tasks) {
    try {
      const paths = findPaths(target, classifyData, limits);
      const key = getCacheKey(target, limits);

      cache[key] = {
        paths: paths || [],
        quality: 'premium',
        precomputed: true
      };

      completed++;

      if (completed % 10 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const avgTime = elapsed / completed;
        const remaining = (totalTasks - completed) * avgTime;
        console.log(`进度: ${completed}/${totalTasks} (${(completed/totalTasks*100).toFixed(1)}%) | 剩余: ${(remaining/60).toFixed(1)}分钟`);
      }
    } catch (err) {
      console.error(`任务失败: target=${target}, limits=${limits.name}`, err.message);
      failed++;
    }
  }

  // 保存结果
  const output = {
    metadata: {
      version: '1.0',
      generated: new Date().toISOString(),
      totalTasks,
      completed,
      failed,
      targetRange: TARGET_RANGE,
      limitsConfigs: LIMITS_CONFIGS.map(l => l.name)
    },
    cache
  };

  writeFileSync('./precomputed_cache.json', JSON.stringify(output, null, 2));

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n预计算完成！`);
  console.log(`成功: ${completed}, 失败: ${failed}`);
  console.log(`总耗时: ${(totalTime/60).toFixed(1)}分钟`);
  console.log(`平均: ${(totalTime/completed).toFixed(2)}秒/任务`);
  console.log(`文件大小: ${(JSON.stringify(output).length / 1024 / 1024).toFixed(2)} MB`);
}

precompute().catch(console.error);
