# 管理员数据显示大屏规划

本文档记录管理员专用数据显示大屏的设计目标、数据架构、接口规划和实施注意事项。该页面只用于站点管理员观察大致趋势，不面向普通用户，也不应影响普通用户正常使用计算功能。

## 目标

- 提供一个隐藏的管理员数据页面，用于查看计算服务的大致运行趋势。
- 展示计算次数、缓存命中率、平均耗时、排队状态、异常状态、近期事件等核心信息。
- 数据统计尽量完整保留历史总量，同时避免每次访问大屏时扫描全部日志。
- 保持低资源占用，适配 2 核 2G 云服务器。
- 后续可复用部分统计结果到 About 页面，例如累计完成计算次数。

## 页面入口

建议新增隐藏路由：

```text
/#/admin-dashboard
```

注意：

- 不放入顶部导航栏。
- 普通用户不会自动访问，也不会在普通页面触发管理员接口请求。
- 页面内需要输入管理员 token 后再读取数据。

## 管理员鉴权

前端只做交互体验，真正安全由 Go 后端接口保证。

推荐流程：

1. 用户访问 `/#/admin-dashboard`。
2. 页面显示管理员 token 输入面板。
3. 输入后将 token 存入 `sessionStorage`。
4. 管理员接口请求统一携带请求头：

```text
X-Admin-Token: <token>
```

或：

```text
Authorization: Bearer <token>
```

5. Go 后端使用 `ADMIN_TOKEN` 环境变量校验。
6. token 错误时返回 `401`；未配置 `ADMIN_TOKEN` 时返回 `404`。

现有 Go 后端已经有管理员鉴权基础：

```text
go-backend/internal/api/handler.go
```

当前已有受保护接口：

```text
GET /cache-stats
GET /server-stats
```

## 推荐数据架构

最终采用：

```text
calc-events.log
      ↓
后台增量聚合器
      ↓
admin-stats.json
      ↓
内存统计快照
      ↓
/admin/overview
      ↓
管理员大屏
```

这不是纯内存统计，而是“日志持久化 + 增量聚合 + 统计快照 + 接口快速读取”。

各部分职责：

- `calc-events.log`：原始计算事件流水日志，保留完整事件证据。
- `admin-stats.json`：总结性统计文件，保存历史累计结果和日志读取位置。
- 内存统计快照：Go 后端运行期间提供快速读取。
- `/admin/overview`：管理员大屏读取的聚合接口。

## 为什么不采用纯内存统计

纯内存方案：

```text
/find-paths 完成
      ↓
直接更新内存计数
      ↓
/admin/overview 读取内存
```

优点是简单、快速。

问题是：

- 后端重启后统计归零。
- 难以恢复历史数据。
- 与“查看全部历史趋势”的目标不匹配。

因此不建议作为最终方案。

## 为什么不每次扫描全部日志

不建议：

```text
/admin/overview
      ↓
每次读取 calc-events.log 全文件
      ↓
现场聚合
```

问题是：

- 日志变大后接口会越来越慢。
- 大屏刷新会反复消耗 CPU 和磁盘 IO。
- 可能影响普通用户计算请求。
- 2 核 2G 服务器不适合这种访问模式。

因此管理员接口应只读取内存快照，不能每次全量扫描日志。

## admin-stats.json 建议结构

第一版可以包含：

```json
{
  "version": 1,
  "updatedAt": "2026-05-24T20:00:00+08:00",
  "source": {
    "file": "calc-events.log",
    "offset": 12345678,
    "size": 12345678
  },
  "totals": {
    "calculations": 18392,
    "success": 18001,
    "timeout": 12,
    "queueFull": 3,
    "badRequest": 376,
    "error": 0,
    "cacheHit": 14200,
    "cacheMiss": 3801,
    "durationTotalMs": 923001
  },
  "byHour": {},
  "byDay": {},
  "byMonth": {},
  "recentEvents": []
}
```

关键字段：

- `source.offset`：上次已经读取到日志文件的字节位置。
- `totals`：全量累计统计。
- `byHour`：小时级趋势，适合最近 24 小时。
- `byDay`：日级趋势，适合最近 7 天 / 30 天。
- `byMonth`：月级趋势，适合年度视图。
- `recentEvents`：最近 N 条事件，建议最多保存 50 到 100 条。

## 增量聚合流程

后端启动时：

1. 读取 `admin-stats.json`。
2. 恢复历史累计统计和上次日志 offset。
3. 打开 `calc-events.log`。
4. 从 offset 位置继续读取新增日志。
5. 将新增事件聚合到内存快照。
6. 定期写回 `admin-stats.json`。

后端运行时：

1. 每隔 1 到 5 分钟检查一次 `calc-events.log`。
2. 从上次 offset 开始读取新增内容。
3. 更新内存统计快照。
4. 写入新的 `admin-stats.json`。

管理员页面访问时：

1. 请求 `/admin/overview`。
2. 后端直接返回内存统计快照。
3. 不扫描日志文件。

## 文件写入安全

写 `admin-stats.json` 时建议使用临时文件 + 原子替换：

```text
admin-stats.json.tmp
      ↓
rename
      ↓
admin-stats.json
```

这样可以避免服务崩溃或机器断电时写出半截 JSON。

建议路径：

开发环境：

```text
go-backend/logs/admin-stats.json
```

生产环境：

```text
/var/log/ark-lmd/admin-stats.json
```

## logrotate 注意事项

生产环境已有日志轮转规划：

```text
/var/log/ark-lmd/*.log
```

当发生 logrotate 时，可能出现：

```text
上次 offset = 100MB
当前 calc-events.log = 2KB
```

说明当前日志文件已经被轮转，新文件重新开始写入。

第一版处理方式：

```text
如果当前文件 size < source.offset
  -> 认为发生 logrotate
  -> 从当前 calc-events.log 开头读取
```

后续如果需要更严谨，可以记录 inode 或文件指纹。

注意：

- `admin-stats.json` 不应该被当作普通 `.log` 文件轮转。
- 如果放在 `/var/log/ark-lmd/` 下，logrotate 规则应只匹配 `*.log`。

## 大屏刷新策略

为了避免占用过多服务器资源：

- 不使用 WebSocket。
- 不做秒级实时刷新。
- `/admin/overview` 建议 30 到 60 秒刷新一次。
- 趋势图数据建议 2 到 5 分钟刷新一次。
- 最近事件最多返回 50 条。
- 后端接口只读内存快照，不进行现场重聚合。

## 第一版展示内容

建议第一版先展示这些核心指标：

- 后端状态：在线 / 维护中 / 接口异常。
- 今日计算次数。
- 总计算次数。
- 最近 24 小时计算次数趋势。
- 平均耗时。
- 缓存命中率。
- 当前 running / queued。
- queue rejected 总数。
- 成功、超时、队列满、参数错误、其他错误数量。
- 快速模式 / 加强模式占比。
- 缓存 hit / miss 占比。
- 最近 30 到 50 条计算事件。

最近事件建议展示：

- 时间。
- 龙门币差值。
- 计算模式。
- 缓存状态。
- 耗时。
- 返回方案数。
- 状态。

不要展示原始 IP。若确实需要观察用户分布，优先使用 `ip_hash` 或匿名聚合。

## 建议新增接口

第一版建议：

```text
GET /admin/overview
```

返回聚合后的全部大屏数据。

当前实现状态：

- 已新增隐藏前端路由：`/#/admin-dashboard`。
- 已新增后端接口：`GET /admin/overview`。
- 该接口复用现有管理员鉴权，必须携带 `X-Admin-Token` 或 `Authorization: Bearer <token>`。
- 前端 token 保存在 `sessionStorage`，关闭浏览器会话后需要重新输入。
- 管理员页面不放入导航栏，普通用户页面不会请求该接口。
- 小机器人不会在管理员页面显示。

后续可以拆分：

```text
GET /admin/trends?range=day|week|month|year
GET /admin/recent-events?limit=50
GET /admin/health
```

但第一版不必过早拆太细，先保证可用。

## 实施顺序

建议按以下顺序实现：

1. 后端新增 `internal/adminstats` 包。已完成。
2. 定义 `admin-stats.json` 结构。已完成。
3. 实现启动时读取 `admin-stats.json`。已完成。
4. 实现读取 `calc-events.log` 新增内容。已完成。
5. 实现内存统计快照。已完成。
6. 实现定期写回 `admin-stats.json`。已完成。
7. 实现 `/admin/overview` 管理员接口。已完成。
8. 前端新增隐藏页面 `AdminDashboard.jsx`。已完成。
9. 前端实现 token 输入和 `sessionStorage` 保存。已完成。
10. 前端展示核心状态卡和最近事件。已完成。
11. 再逐步补更精细的趋势图和视觉优化。待后续推进。

## 使用方式

后端需要配置：

```text
ADMIN_TOKEN=你自己的管理员口令
```

访问：

```text
https://你的域名/#/admin-dashboard
```

页面会要求输入管理员 token。输入正确后，前端会请求：

```text
GET /admin/overview
```

开发环境统计文件：

```text
go-backend/logs/admin-stats.json
```

生产环境统计文件：

```text
/var/log/ark-lmd/admin-stats.json
```

如果需要清空管理员统计数据，可以在后端停止后删除 `admin-stats.json`。不建议删除 `calc-events.log`，因为它是原始事件记录。

## 资源控制原则

- 普通用户请求路径只保留现有日志写入，不额外触发大屏逻辑。
- 聚合器后台低频运行，避免频繁扫描文件。
- 管理员接口只读快照。
- 前端低频轮询。
- 不因为大屏功能引入数据库，除非后续数据量和查询需求明显变复杂。

## 后续可扩展方向

- 将 About 页累计计算次数改为读取聚合结果。
- 增加维护状态控制入口，但需要额外确认安全策略。
- 增加异常告警，例如队列拒绝次数快速上升时高亮。
- 增加常用差值区间统计。
- 增加计算耗时分位数，例如 P50 / P95。
- 增加按天导出统计 JSON。
