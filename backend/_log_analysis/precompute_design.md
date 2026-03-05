# 预计算方案设计

## 数据分析结论

### 覆盖率目标
- **Tier 1（3种）**: 66.59%覆盖
- **Tier 1 + Top 4（7种）**: 82.10%覆盖
- **缓存命中率**: 当前96.36%

### Target分布特征
- 35%集中在[-100, 99]
- 小范围为主，极端值较少
- 建议范围：[-5000, +5000]

### 限制组合（按频率）
1. none（无限制）: 58.19%
2. {10,10,10,200}: 9.10%
3. nosanity（理智=0）: 5.81%
4. noupgrade（升级=0）: 2.59%
5. {10,10,10,100}: 1.72%
6. {10,10,10,10}: 1.50%
7. {10,10,10,null}: 1.19%

---

## 预计算方案

### 阶段1：快速上线（推荐）

**预计算范围：**
- Target: [-5000, +5000]，步长100 → 101个点
- 限制组合: 7种（Tier 1 + Top 4）
- **总任务数: 707个**

**预计算时间：**
- 单次计算: ~5秒（E+F优化版本）
- 总时间: 707 × 5s ≈ 1小时（单线程）
- 并行化（4核）: ~15分钟

**存储估算：**
- 每个结果: ~10KB（10条路径 × ~1KB）
- 总大小: 707 × 10KB ≈ 7MB
- 格式: JSON文件

**覆盖率提升：**
- 从96.36%提升至~98%+（预估）

---

### 阶段2：扩展覆盖（可选）

**扩展方案：**
- 添加Top 15限制组合
- Target步长缩小至50
- 覆盖率提升至85%+

**增量成本：**
- 任务数: ~1500个
- 时间: ~2小时
- 存储: ~15MB

---

## 技术实现

### 1. 预计算脚本结构

```
precompute.mjs
├── 配置定义（target范围、limits组合）
├── items数据加载
├── 调用DPnew.js计算函数
├── 结果序列化和存储
└── 进度显示和错误处理
```

### 2. 存储方案

**方案A：单文件JSON（推荐阶段1）**
```json
{
  "metadata": {
    "version": "1.0",
    "generated": "2026-03-05",
    "coverage": "82.10%"
  },
  "cache": {
    "target_-100_none": { "paths": [...], "steps": 3 },
    "target_0_none": { "paths": [...], "steps": 2 },
    ...
  }
}
```

**优点：**
- 简单，易于部署
- 7MB可直接加载到内存
- 查询速度快（O(1)）

**缺点：**
- 单文件较大
- 更新需要重新加载

---

**方案B：分文件存储（推荐阶段2）**
```
precomputed/
├── none.json          (5900个target点)
├── nosanity.json
├── noupgrade.json
├── combo_10_10_10_200.json
└── ...
```

**优点：**
- 按需加载
- 易于增量更新
- 文件小（每个~1MB）

**缺点：**
- 文件系统开销
- 查询需要确定文件

---

### 3. 运行时集成

**查询流程：**
```javascript
function getResult(target, limits) {
  // 1. 生成cache key
  const key = generateCacheKey(target, limits);

  // 2. 查询预计算结果
  if (precomputedCache.has(key)) {
    return precomputedCache.get(key); // 直接返回
  }

  // 3. Cache miss - 实时计算
  const result = calculateDP(target, items, limits);

  // 4. 标记质量等级
  result.quality = 'standard'; // 预计算为'premium'

  return result;
}
```

**质量标记：**
- `premium`: 预计算结果（高质量）
- `standard`: 实时计算结果（可能受时间限制）

---

### 4. 并行化策略

**使用Worker Threads：**
```javascript
import { Worker } from 'worker_threads';

// 主进程：任务分发
const workers = Array(4).fill(null).map(() => new Worker('./worker.mjs'));
const tasks = generateTasks(); // 707个任务

// Worker进程：执行计算
// worker.mjs
parentPort.on('message', ({ target, limits, items }) => {
  const result = calculateDP(target, items, limits);
  parentPort.postMessage({ target, limits, result });
});
```

**性能提升：**
- 4核并行: 4x加速
- 1小时 → 15分钟

---

## 部署方案

### 本地预计算（推荐）

**步骤：**
1. 在开发机运行预计算脚本
2. 生成JSON文件
3. 提交到Git仓库
4. 部署时随代码一起上线

**优点：**
- 简单可靠
- 无需服务器资源
- 版本可控

---

### 阿里云A10预计算（可选）

**使用场景：**
- 阶段2扩展（任务量大）
- 定期更新（items数据变化）

**步骤：**
1. 上传脚本和数据到A10
2. 运行预计算（利用多核）
3. 下载结果文件
4. 部署到生产环境

**优点：**
- 计算速度快
- 不占用本地资源

---

## 风险评估

### 1. Items数据变化
**风险：** 游戏更新后items变化，预计算结果失效

**应对：**
- 版本号管理
- 检测items变化时重新预计算
- 或者只预计算稳定的items子集

### 2. 存储大小
**风险：** 阶段2扩展后文件过大

**应对：**
- 压缩JSON（gzip可减少70%）
- 只存储关键字段（去掉冗余信息）
- 使用二进制格式（MessagePack）

### 3. 计算质量
**风险：** 预计算结果质量不如实时计算

**应对：**
- 预计算使用最高质量参数
- 定期验证结果正确性
- 提供"重新计算"选项

---

## 推荐方案

**立即实施：阶段1**
- 707个任务
- 单文件JSON存储
- 本地预计算
- 覆盖率82%+

**后续优化：阶段2**
- 根据实际cache miss情况决定
- 如果miss率<2%，无需扩展
- 如果miss率>5%，考虑扩展Top 15

---

## 下一步

1. 编写预计算脚本（precompute.mjs）
2. 测试单个任务的计算时间
3. 运行完整预计算
4. 集成到DPnew.js
5. 部署验证
