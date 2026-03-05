import fs from 'fs';

const content = fs.readFileSync('_bench_result_EF.txt', 'utf-8');
const lines = content.split('\n');

let currentBetter = 0, currentWorse = 0, currentSame = 0;
let speedSlower = 0, speedFaster = 0;
let totalSpeedRatio = 0, count = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('original') && lines[i+1]?.includes('current')) {
    const origMatch = lines[i].match(/\|\s+(\d+)\s+\|\s+(\d+)\s+\|\s+(\d+)\s+\|\s+([\d.]+)\s+\|/);
    const currMatch = lines[i+1].match(/\|\s+(\d+)\s+\|\s+(\d+)\s+\|\s+(\d+)\s+\|\s+([\d.]+)\s+\|/);
    
    if (origMatch && currMatch) {
      const origTime = parseInt(origMatch[1]);
      const origAvgTypes = parseFloat(origMatch[4]);
      const currTime = parseInt(currMatch[1]);
      const currAvgTypes = parseFloat(currMatch[4]);
      
      // 质量对比
      if (currAvgTypes < origAvgTypes - 0.05) currentBetter++;
      else if (currAvgTypes > origAvgTypes + 0.05) currentWorse++;
      else currentSame++;
      
      // 速度对比
      if (currTime > origTime) speedSlower++;
      else speedFaster++;
      
      totalSpeedRatio += currTime / origTime;
      count++;
    }
  }
}

console.log('=== E+F 优化效果分析 ===\n');
console.log('质量对比（avgTypes）：');
console.log(`  改善: ${currentBetter} 个case`);
console.log(`  持平: ${currentSame} 个case`);
console.log(`  回归: ${currentWorse} 个case`);
console.log(`  改善率: ${(currentBetter/count*100).toFixed(1)}%\n`);

console.log('速度对比：');
console.log(`  变慢: ${speedSlower} 个case`);
console.log(`  变快: ${speedFaster} 个case`);
console.log(`  平均速度比: ${(totalSpeedRatio/count).toFixed(2)}x`);
