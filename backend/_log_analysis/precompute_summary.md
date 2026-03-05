# 预计算方案总结（待实施）

## 背景

**目标：** 通过预计算提升DPnew.js算法的质量和速度

**现状：**
- E+F优化版本：质量优秀，但速度慢3倍
- 当前缓存命中率：96.36%
- 日均请求：63.81次
- 独立IP：9,455个

---

## 日志分析结果

### 核心数据（2025-04-19 至 2026-02-12，299天）

**请求分布：**
- 总请求：19,080次
- Target集中度：35%在[-100, 99]区间
- 缓存命中率：96.36%（17,952 hits / 679 misses）

**限制组合频率（Top 7）：**
1. none（无限制）：58.19%
2. {10,10,10,200}：9.10%
3. nosanity：5.81%
4. noupgrade：2.59%
5. {10,10,10,100}：1.72%
6. {10,10,10,10}：1.50%
7. {10,10,10,null}：1.19%

**Tier 1覆盖率：** 66.59%（3种基础组合）
**Tier 1 + Top 4覆盖率：** 82.10%（7种组合）

---

## 设计方案

### 方案概述

**预计算范围：**
- Target: [-5000, +5000]，步长100 → 101个点
- Limits: 7种（Tier 1 + Top 4）
- Settings: 2种默认配置

**任务量：**
- 101 targets × 7 limits × 2 settings = **1,414个任务**
- 预计时间：2小时（单线程，假设5秒/任务）
- 存储大小：约14MB（JSON格式）

**预期收益：**
- Cache miss率：3.64% → <2%
- 质量提升：所有预计算结果使用最高质量参数
- 覆盖率：预估90-95%

---

## 核心问题（阻塞因素）

### 问题1：Settings组合爆炸 ⚠️ 高优先级

**发现：**
- SettingsPanel有15个布尔开关（allow3Star, allow2Star等）
- 理论组合数：2^15 = 32,768种
- Settings通过`filterItems(settings)`影响items数组
- 缓存key格式：`paths:${target}:${JSON.stringify(settings)}:${limits}`

**影响：**
- 如果预计算所有settings：23,117,824个任务（不可行）
- 如果只预计算默认settings：可能覆盖率不足

**默认Settings配置：**

初始默认（defaultState.settings）：
```javascript
{
  allow3Star: true, allow2Star: true, allowMaterial: true,
  allowStore20: true, allowStore10: true, allowStore70: true,
  allowStore2000: true, allowStore5000: true,
  allowCE: true, allowExt25: true, allowTrade: true,
  allowUpgradeOnly0: false, allowUpgradeOnly1: false,
  allowUpgradeOnly2: false, allowUpgradeOnlyFor1: false
}
```

恢复默认（freshDefaults）：
```javascript
{
  ...defaultState.settings,
  allowStore10: false, allowStore20: false, allowStore70: false,
  allowStore2000: false, allowStore5000: false, allowExt25: false,
  allowUpgradeOnly0: true, allowUpgradeOnly1: true,
  allowUpgradeOnly2: true, allowUpgradeOnlyFor1: true
}
```

**当前状态：**
- ❌ 日志中没有记录settings
- ❌ 无法统计实际使用的settings组合
- ❓ 不确定用户是否使用默认settings

**假设：**
- 96.36%缓存命中率说明大部分用户使用相同配置
- 可能是默认settings之一

**风险：**
- 如果假设错误，预计算覆盖率会远低于预期

---

### 问题2：缺少Settings使用数据 ⚠️ 高优先级

**问题：**
- 日志只记录了4个limit字段
- 没有记录15个settings开关的状态
- 无法验证"大部分用户使用默认settings"的假设

**需要：**
- 修改server.js日志记录逻辑
- 添加settings统计
- 收集1-2周实际数据

**代码位置：**
- 前端：`src/App.jsx`（第35-51行，默认settings）
- 后端：`backend/server.js`（第45-67行，filterItems函数）
- 缓存：`backend/server.js`（第189行，cacheKey生成）

---

### 问题3：单任务耗时未知 ⚠️ 中优先级

**问题：**
- 假设每任务5秒，但未实测验证
- 小target可能<1秒，大target可能>10秒
- 实际总耗时可能远超2小时

**需要：**
- 先运行小规模测试（10-20个任务）
- 测量实际耗时
- 调整预计算范围

---

### 问题4：Items数据变化风险 ⚠️ 低优先级

**问题：**
- 游戏更新后items数据可能变化
- 预计算结果会失效

**缓解：**
- 版本号管理
- 检测items变化时重新预计算
- 或只预计算稳定的items子集

---

## 技术实现

### 已完成

1. ✅ 日志分析脚本（`analyze.mjs`）
   - 统计9个指标
   - 识别热门限制组合
   - 生成分析报告

2. ✅ 预计算脚本框架（`precompute.mjs`）
   - 导入findPaths函数
   - 加载classifyData
   - 任务生成和进度显示
   - 结果序列化

3. ✅ 接口验证
   - 确认findPaths函数签名
   - 确认items数据位置（`data/gameItems.json`）
   - 确认返回格式

### 待完成

1. ❌ 添加settings配置到precompute.mjs
2. ❌ 小规模测试（验证耗时和正确性）
3. ❌ 运行完整预计算
4. ❌ 集成到DPnew.js
5. ❌ 部署验证

---

## 实施建议（后期参考）

### 阶段1：数据收集（优先）

**目标：** 获取settings使用数据，验证假设

**步骤：**
1. 修改`backend/server.js`日志记录
   - 在第189行cacheKey生成后，记录settings
   - 格式：`logger.info({ settings }, "Settings used")`

2. 部署新版本，收集1-2周数据

3. 分析settings使用情况
   - 统计settings组合频率
   - 识别Top 10热门settings
   - 计算覆盖率

**决策点：**
- 如果Top 2覆盖率>90%：实施预计算
- 如果Top 10覆盖率<80%：放弃预计算方案

---

### 阶段2：小规模测试

**目标：** 验证预计算脚本和性能

**步骤：**
1. 修改`precompute.mjs`
   - 添加2种默认settings配置
   - 缩小范围：10 targets × 2 settings × 7 limits = 140任务

2. 运行测试
   - 测量实际耗时
   - 验证结果正确性
   - 检查存储大小

3. 评估
   - 如果单任务<3秒：可行
   - 如果单任务>10秒：需要优化或缩小范围

---

### 阶段3：完整预计算

**目标：** 生成生产环境缓存

**步骤：**
1. 运行完整预计算（1,414任务）
2. 生成`precomputed_cache.json`（约14MB）
3. 验证数据完整性

---

### 阶段4：集成部署

**目标：** 将预计算结果集成到生产环境

**步骤：**
1. 修改DPnew.js或server.js
   - 加载预计算缓存
   - 查询逻辑：先查预计算，miss则实时计算

2. 部署验证
   - 监控cache miss率变化
   - 监控响应时间
   - 收集用户反馈

3. 效果评估
   - 预期：cache miss率从3.64%降至<2%
   - 如果效果不佳，分析原因

---

## 文件清单

**分析相关：**
- `backend/_log_analysis/analyze.mjs` - 日志分析脚本
- `backend/_log_analysis/analysis_report.txt` - 分析报告
- `backend/_log_analysis/analysis_data.json` - 详细数据

**设计文档：**
- `backend/_log_analysis/precompute_design.md` - 详细设计方案
- `backend/_log_analysis/precompute_evaluation.md` - 完整评估报告
- `backend/_log_analysis/precompute_summary.md` - 本文档

**代码：**
- `backend/_log_analysis/precompute.mjs` - 预计算脚本（未完成）
- `backend/DPnew.js` - 核心算法（findPaths函数）
- `backend/DataService.js` - 数据服务（classifyData）
- `backend/server.js` - API服务（filterItems, cacheKey）
- `src/App.jsx` - 前端配置（默认settings）
- `src/components/SettingsPanel.jsx` - 设置面板（15个开关）

---

## 关键决策点

### 是否实施预计算？

**支持理由：**
- ✅ 96.36%缓存命中率说明用户行为集中
- ✅ 可以提升质量（无时间限制）
- ✅ 技术方案可行

**反对理由：**
- ❌ Settings组合未知，覆盖率不确定
- ❌ 需要额外的开发和维护成本
- ❌ Items数据变化需要重新预计算

**建议：**
- 先收集settings使用数据（阶段1）
- 根据数据决定是否继续

---

## 总结

**核心问题：** Settings组合爆炸 + 缺少使用数据

**解决路径：** 数据收集 → 验证假设 → 小规模测试 → 完整实施

**预期收益：** Cache miss率降低50%，质量提升

**风险：** 如果用户使用多种settings，预计算可能无效

**建议：** 暂时搁置，先收集settings使用数据
