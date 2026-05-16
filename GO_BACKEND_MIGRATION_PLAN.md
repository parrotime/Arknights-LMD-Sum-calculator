# 后端 Golang 改造技术路线参考

本文档用于规划 ark-lmd.top 后端从现有 Node.js/JS 计算服务迁移到 Golang 的大版本改造。目标不是在现有 JS 代码上继续小修小补，而是以 Go 重新实现后端计算核心、接口层、缓存与部署流程，同时保持前端调用体验稳定。

## 1. 改造背景

当前后端主要由 Express + worker_threads + DPnew.js 组成。现有架构已经具备基本的限流、缓存、队列和超时保护，但核心计算仍是 CPU 密集型组合搜索。

实际部署服务器配置较低：

- CPU：2 vCPU
- 内存：2 GiB
- 公网带宽：3 Mbps
- 系统盘：40 GB
- 系统：CentOS 8.5

在该配置下，后端主要瓶颈不是网络带宽，而是 CPU 和内存。DPnew.js 的搜索过程包含大量数组复制、Map 操作、路径规范化、去重和排序，在并发请求或加强模式下容易造成响应变慢。

因此，本次后端改造的核心目标是：

- 使用 Go 重写计算服务，提高 CPU 执行效率和内存可控性。
- 保留前端现有交互和接口语义，降低前端改造成本。
- 支持“快速计算模式”和“计算加强模式”两套计算策略。
- 为后续缓存、预计算、性能统计和部署运维打好基础。

## 2. 总体目标

### 2.1 必须达成

- 提供兼容现有前端的 `/find-paths` 接口。
- Go 后端能够读取 `data/gameItems.json`。
- 复刻现有 DPnew.js 的核心计算规则。
- 支持用户配置项 `settings`。
- 支持数量限制 `userLimits`。
- 支持赤金订单限制：
  - `trade2Limit`
  - `trade3Limit`
  - `trade4Limit`
  - `trade5Limit`
- 支持计算模式：
  - `fast`
  - `strong`
- 返回结构与当前前端兼容。
- 提供单元测试和关键样例对照测试。
- 支持生产环境超时、限流、缓存和优雅关闭。

### 2.2 暂不优先

- 不急于引入 Redis。
- 不急于引入消息队列。
- 不急于做多机部署。
- 不急于重写前端。
- 不急于完全复刻 Node 后端所有内部实现细节。

## 3. 推荐架构

推荐采用单体 Go 后端，不拆微服务。

```text
前端 React
   |
   | POST /find-paths
   v
Go HTTP Server
   |
   |-- 请求校验
   |-- settings 过滤物品
   |-- cache 查询
   |-- calcMode 选择计算配置
   |-- DP 计算
   |-- 结果缓存
   v
JSON Response
```

在当前服务器配置下，单体 Go 服务更合适：

- 部署简单。
- 内存占用低。
- 不需要维护额外 Redis / MQ 进程。
- 避免小服务器上组件过多导致运维复杂度上升。

## 4. 目录建议

可以在项目中新增 `go-backend` 目录：

```text
main/
  go-backend/
    cmd/
      server/
        main.go
    internal/
      api/
        handler.go
        request.go
        response.go
      calc/
        dp.go
        normalize.go
        limits.go
        mode.go
      data/
        items.go
      cache/
        lru.go
      middleware/
        ratelimit.go
        recovery.go
      config/
        config.go
    tests/
      fixtures/
    go.mod
    go.sum
```

说明：

- `cmd/server`：程序入口。
- `internal/api`：HTTP 接口层。
- `internal/calc`：DP 算法核心。
- `internal/data`：读取和管理 `gameItems.json`。
- `internal/cache`：本地 LRU 缓存。
- `internal/middleware`：限流、日志、panic recovery。
- `internal/config`：环境变量配置。

## 5. 接口设计

### 5.1 请求

保持现有接口：

```http
POST /find-paths
Content-Type: application/json
```

请求体建议扩展：

```json
{
  "target": 2500,
  "settings": {
    "allow3Star": true,
    "allow2Star": true,
    "allowMaterial": true,
    "allowTrade": true
  },
  "userLimits": {
    "upgrade0Limit": 10,
    "upgrade1Limit": 10,
    "upgrade2Limit": 10,
    "sanityLimit": 200,
    "trade2Limit": 10,
    "trade3Limit": 10,
    "trade4Limit": 10,
    "trade5Limit": 10
  },
  "rawGoal": 10000,
  "calcMode": "fast"
}
```

`calcMode` 缺省时建议按 `fast` 处理。

### 5.2 响应

保持当前前端可用格式：

```json
{
  "success": true,
  "paths": [
    [
      { "id": 222, "count": 1 }
    ]
  ],
  "duration": 12,
  "cache": "miss",
  "mode": "fast"
}
```

错误响应：

```json
{
  "error": "计算超时，请尝试简化设置后重试。"
}
```

## 6. 计算模式设计

### 6.1 快速计算模式

目标：

- 优先保证响应速度。
- 返回可用、质量稳定的方案。
- 降低服务器 CPU 压力。

建议参数：

```text
target 范围：-5000 ~ 5000
最终返回路径数：最多 10
每个 sum 保留路径数：6 ~ 10
target 候选路径数：12 ~ 18
最大搜索步数：5 ~ 6
单次计算超时：5s ~ 8s
```

适合默认按钮和普通用户。

### 6.2 计算加强模式

目标：

- 尽量提高答案质量和路径多样性。
- 尽量算满 10 条路径。
- 可适度放宽输入范围。

建议参数：

```text
target 范围：-8000 ~ 8000
最终返回路径数：10
每个 sum 保留路径数：12 ~ 20
target 候选路径数：25 ~ 40
最大搜索步数：6，谨慎尝试 7
单次计算超时：10s ~ 15s
```

加强模式必须进入缓存 key，并建议设置更严格的限流。

## 7. 算法迁移策略

### 7.1 不建议逐行翻译

DPnew.js 中存在很多由 JS 数据结构习惯形成的实现方式，例如：

- 大量数组复制。
- 多层 Map / Set。
- 每次保存路径时进行 normalize。
- 最终阶段再做路径质量过滤。

Go 版应复刻规则，而不是逐行复刻实现。

### 7.2 推荐拆成四层

```text
1. Item 层
   读取 gameItems.json，构建 id -> item 映射。

2. Candidate 层
   根据 settings 和 userLimits 生成可用候选。

3. Search 层
   根据 calcMode 执行组合搜索。

4. Result 层
   规范化、去重、排序、质量过滤、截断。
```

这样可以避免算法逻辑全部堆在一个文件里。

### 7.3 关键规则必须保留

- 贸易站赤金组合需要保留多样性，例如：
  - `222 x 1`
  - `117 x 1 + 118 x 1`
- 赤金限制必须准确生效。
- 材料合成可以继续使用贪心或受限 DP。
- 理智关卡需要考虑理智消耗限制。
- 升级消耗类物品需要遵守数量限制。
- 需要过滤明显劣质路径，例如可移除的正负抵消子集。
- 最终排序仍应优先考虑：
  - 步骤种类少
  - 总操作次数少
  - 路径类型多样性

## 8. 性能设计

### 8.1 并发控制

Go 虽然并发能力更强，但当前机器只有 2 vCPU，不应无限开 goroutine 计算。

建议：

```text
fast 并发计算数：1 ~ 2
strong 并发计算数：1
等待队列：5 ~ 10
```

可以使用带 buffer 的 channel 作为计算信号量。

### 8.2 超时控制

每次请求应使用 `context.WithTimeout`。

建议：

```text
fast：5s ~ 8s
strong：10s ~ 15s
```

算法内部需要定期检查 context，不能只在 HTTP 层超时。

### 8.3 缓存

第一阶段建议使用进程内 LRU 缓存。

缓存 key 应包含：

- `target`
- `settings`
- `userLimits`
- `calcMode`
- `gameItems` 数据版本

缓存值：

- paths
- duration
- createdAt

建议容量：

```text
fast cache：500 ~ 2000 条
strong cache：100 ~ 500 条
TTL：1h ~ 6h
```

暂不建议直接上 Redis。只有出现以下情况再考虑：

- 多个 Go 实例同时部署。
- PM2/systemd 启动多个后端进程。
- 缓存命中率很重要且不能随进程重启丢失。
- 需要跨进程共享限流状态。

## 9. 限流策略

建议按模式分别限流：

```text
fast：每 IP 每分钟 15 次
strong：每 IP 每分钟 3 ~ 5 次
```

加强模式更耗 CPU，不能和快速模式使用同一限流规则。

第一阶段可以使用内存限流。后续如部署多实例，再换 Redis 限流。

## 10. 测试策略

### 10.1 单元测试

需要覆盖：

- 输入校验。
- settings 过滤。
- userLimits 限制。
- trade2/3/4/5 限制。
- 快速模式参数。
- 加强模式参数。
- 路径去重。
- 劣质路径过滤。
- 缓存 key。

### 10.2 对照测试

建议保留一批 JS 版结果作为 fixtures。

样例包括：

```text
target = 2500
默认配置
期望包含：
- 贸易站售卖5条赤金
- 贸易站售卖2条赤金 + 贸易站售卖3条赤金
```

以及：

```text
trade5Limit = 0
期望不出现 id=222
```

还应覆盖：

- 正目标。
- 负目标。
- 无赤金。
- 无材料。
- 无升级消耗。
- 理智限制为 0。
- 加强模式 target 超过 5000 但不超过 8000。

### 10.3 性能测试

建议记录：

- 平均耗时。
- P95 耗时。
- P99 耗时。
- 超时率。
- 缓存命中率。
- 单请求峰值内存。
- 并发 1 / 2 / 5 下的表现。

## 11. 部署建议

Go 后端可以编译为单个二进制。

```bash
go build -o ark-lmd-backend ./cmd/server
```

推荐用 systemd 管理：

```text
Restart=always
RestartSec=3
Environment=PORT=3002
Environment=NODE_ENV=production
```

也可以继续用 PM2 管理二进制，但 Go 服务更推荐 systemd。

Nginx 继续反代：

```text
/find-paths -> http://127.0.0.1:3002/find-paths
```

## 12. 分阶段路线

### 阶段 1：Go 服务骨架

- 新建 `go-backend`。
- 实现 `/` 健康检查。
- 实现 `/find-paths` 请求解析和响应格式。
- 读取 `gameItems.json`。
- 暂时返回 mock paths。

### 阶段 2：规则和数据层

- 实现 item 类型定义。
- 实现 settings 过滤。
- 实现 userLimits 校验和 hard caps。
- 实现 calcMode 参数配置。

### 阶段 3：算法核心迁移

- 实现基础路径搜索。
- 实现赤金组合枚举。
- 实现材料组合。
- 实现关卡组合。
- 实现升级消耗组合。
- 实现路径 normalize。
- 实现路径去重和排序。
- 实现劣质路径过滤。

### 阶段 4：兼容性对照

- 和 JS 版核心样例对照。
- 确保前端无需大改即可调用。
- 修正结果排序和展示差异。

### 阶段 5：性能保护

- 加入本地 LRU 缓存。
- 加入限流。
- 加入并发信号量。
- 加入 context 超时。
- 加入 panic recovery。
- 加入结构化日志。

### 阶段 6：灰度上线

- 本地压测。
- 服务器旁路部署 Go 后端。
- 前端或 Nginx 临时切换测试。
- 保留 Node 后端作为回滚方案。
- 稳定后移除 Node 生产入口。

## 13. 风险与应对

### 13.1 结果不一致

风险：Go 版和 JS 版结果顺序或内容不同。

应对：

- 建立 fixtures。
- 只要求核心规则一致，不强求所有路径完全一致。
- 对关键目标值人工验收。

### 13.2 加强模式过慢

风险：target 放宽到 8000 后，搜索量明显膨胀。

应对：

- 加强模式分阶段放宽。
- 先提高路径质量，再提高 target 上限。
- 使用独立限流和独立超时。

### 13.3 小服务器资源不足

风险：2C2G 无法承受并发加强计算。

应对：

- strong 并发限制为 1。
- 队列满时快速返回 503。
- 提高缓存命中率。

### 13.4 迁移周期变长

风险：算法规则复杂，重写成本高。

应对：

- 先实现兼容版。
- 再做性能版。
- 每个阶段都保持可运行、可测试。

## 14. 推荐结论

本次大更新选择直接转 Go 是可行的，但建议采用“计算服务优先迁移”的路线，而不是一次性重写所有周边能力。

推荐优先级：

```text
1. Go HTTP 接口兼容
2. 数据读取与 settings/userLimits 校验
3. DPnew 核心规则迁移
4. fast/strong 两套模式
5. 缓存、限流、并发控制
6. 灰度部署和回滚
```

在当前服务器配置下，Go 迁移的主要收益预计来自：

- 更低内存占用。
- 更稳定的 CPU 密集型计算。
- 更容易控制并发。
- 更适合后续算法重构。

如果只做等价翻译，性能可能提升约 `2x ~ 5x`。如果迁移时同步优化搜索结构和缓存策略，核心计算在典型场景下可能达到 `5x ~ 20x` 的提升，但实际效果需要以后续 benchmark 为准。
