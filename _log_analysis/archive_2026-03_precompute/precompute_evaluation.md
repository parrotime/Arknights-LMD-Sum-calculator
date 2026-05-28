# 预计算方案评估报告

## 关键发现

### 1. Settings组合问题

**发现：**
- SettingsPanel有15个布尔开关
- 理论组合数：2^15 = 32,768种
- settings通过filterItems()影响items数组
- 缓存key包含settings：`paths:${target}:${JSON.stringify(settings)}:${limits}`

**默认配置（初始状态）：**
```javascript
{
  allow3Star: true,
  allow2Star: true,
  allowMaterial: true,
  allowStore20: true,
  allowStore10: true,
  allowStore70: true,
  allowStore2000: true,
  allowStore5000: true,
  allowCE: true,
  allowExt25: true,
  allowTrade: true,
  allowUpgradeOnly0: false,
  allowUpgradeOnly1: false,
  allowUpgradeOnly2: false,
  allowUpgradeOnlyFor1: false
}
```

**"恢复默认"配置（freshDefaults）：**
```javascript
{
  ...defaultState.settings,
  allowStore10: false,
  allowStore20: false,
  allowStore70: false,
  allowStore2000: false,
  allowStore5000: false,
  allowExt25: false,
  allowUpgradeOnly0: true,
  allowUpgradeOnly1: true,
  allowUpgradeOnly2: true,
  allowUpgradeOnlyFor1: true
}
```

### 2. 日志分析局限

**问题：**
- ❌ 日志中没有记录settings
- ❌ 无法统计实际使用的settings组合
- ✅ 只记录了4个limit字段
- ✅ 缓存命中率96.36%说明大部分用户使用相同配置

**推断：**
- 大部分用户可能使用默认settings
- 少数用户修改settings导致cache miss

---

## 预计算方案对比

### 方案A：预计算默认Settings（推荐）

**范围：**
- Settings: 2种（初始默认 + 恢复默认）
- Target: 101个点（-5000到+5000，步长100）
- Limits: 7种（Tier 1 + Top 4）
- **总任务数: 1,414个**

**时间成本：**
- 单任务5秒 × 1,414 = 118分钟（约2小时）
- 并行化（4核）：30分钟

**存储成本：**
- 1,414 × 10KB ≈ 14MB

**覆盖率：**
- 预估：90-95%（基于96.36%缓存命中率）
- 假设大部分用户使用默认settings

**优点：**
- ✅ 任务量可控
- ✅ 实施简单
- ✅ 覆盖主流用户

**缺点：**
- ⚠️ 无法覆盖自定义settings用户
- ⚠️ 需要验证默认settings假设

**风险：**
- 中等：如果用户实际使用多种settings，覆盖率会下降

---

### 方案B：预计算所有Settings

**范围：**
- Settings: 32,768种
- Target: 101个点
- Limits: 7种
- **总任务数: 23,117,824个**

**时间成本：**
- 单任务5秒 × 23M = 32,000小时（1,333天）
- 并行化（100核）：320小时（13天）

**存储成本：**
- 23M × 10KB ≈ 230GB

**结论：**
- ❌ 完全不可行
- 时间和存储成本都过高

---

### 方案C：动态预计算（长期方案）

**策略：**
1. 先实施方案A（预计算默认settings）
2. 添加settings统计到日志
3. 监控实际使用的settings组合
4. 增量预计算Top 10热门settings

**实施步骤：**
1. **Phase 1（立即）：**
   - 预计算2种默认settings
   - 部署上线

2. **Phase 2（1周后）：**
   - 修改日志记录，添加settings统计
   - 收集1-2周数据

3. **Phase 3（数据分析后）：**
   - 分析实际settings使用情况
   - 识别Top 10热门settings
   - 增量预计算热门settings

**覆盖率：**
- Phase 1: 90-95%
- Phase 3: 98%+

**优点：**
- ✅ 基于实际数据决策
- ✅ 渐进式实施，风险低
- ✅ 最优的投入产出比

**缺点：**
- ⚠️ 需要多阶段实施
- ⚠️ 需要修改日志记录逻辑

---

## 推荐方案

### 立即实施：方案A（预计算默认Settings）

**理由：**
1. 96.36%缓存命中率说明用户行为集中
2. 大部分用户可能使用默认settings
3. 任务量可控（2小时）
4. 快速验证预计算效果

**实施计划：**

**Step 1: 修改precompute.mjs**
- 添加2种默认settings配置
- 生成1,414个任务

**Step 2: 本地运行预计算**
- 预计时间：2小时
- 生成precomputed_cache.json（约14MB）

**Step 3: 集成到DPnew.js**
- 加载预计算缓存
- 查询逻辑：先查预计算，miss则实时计算

**Step 4: 部署验证**
- 监控cache miss率变化
- 预期：从3.64%降至<2%

---

### 后续优化：方案C（动态预计算）

**Step 5: 添加settings统计（部署后1周）**
- 修改server.js日志记录
- 记录完整的settings对象
- 收集1-2周数据

**Step 6: 数据分析（2周后）**
- 统计settings组合频率
- 识别Top 10热门settings
- 评估扩展预计算的必要性

**Step 7: 增量预计算（按需）**
- 如果Top 10覆盖率>98%，无需扩展
- 如果覆盖率<95%，预计算Top 10

---

## 风险评估

### 高风险
- ❌ **假设错误**：如果用户实际使用多种settings，覆盖率会低于预期
  - **缓解**：先小规模测试，监控实际效果

### 中风险
- ⚠️ **Items数据变化**：游戏更新后预计算失效
  - **缓解**：版本号管理，检测items变化时重新预计算

- ⚠️ **存储大小**：14MB可能影响加载速度
  - **缓解**：gzip压缩（可减少70%），或按需加载

### 低风险
- ✅ **计算时间**：2小时可接受
- ✅ **部署复杂度**：JSON文件部署简单

---

## 下一步行动

### 立即执行（今天）

1. **修改precompute.mjs**
   - 添加2种默认settings配置
   - 测试单个任务性能

2. **运行小规模测试**
   - 预计算10个target × 2 settings × 7 limits = 140个任务
   - 验证结果正确性
   - 评估实际耗时

3. **决策点**
   - 如果单任务<3秒：运行完整预计算
   - 如果单任务>10秒：缩小范围或优化算法

### 1周后

4. **添加settings统计**
   - 修改server.js日志记录
   - 部署新版本

5. **监控效果**
   - Cache miss率变化
   - 用户体验反馈

### 2周后

6. **数据分析**
   - 统计settings使用情况
   - 决定是否扩展预计算

---

## 总结

**核心结论：**
1. Settings组合是预计算的最大挑战（32,768种）
2. 但96.36%缓存命中率说明用户行为集中
3. 预计算2种默认settings是最优起点
4. 基于实际数据渐进式扩展

**预期收益：**
- Cache miss率：3.64% → <2%
- 质量提升：所有预计算结果使用最高质量参数
- 用户体验：更快的响应速度，更优的路径

**投入成本：**
- 开发时间：4小时（脚本编写+测试）
- 计算时间：2小时（预计算）
- 存储成本：14MB（可接受）

**ROI：**
- 一次性投入6小时
- 持续收益：每天64次请求中的~2%质量提升
- 值得投入 ✅
