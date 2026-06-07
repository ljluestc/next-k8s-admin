# PR 标题
fix(issue-4): 修复审计/用户时间显示受数据库会话时区影响导致的偏移问题

# 背景
当前系统中的时间字段（如审计日志 `createdAt`、用户 `createdAt/lastLoginAt`）来自 PostgreSQL `timestamp` 列。该类型不包含时区信息，若数据库会话时区与应用预期不一致，接口返回和前端展示容易出现“看起来多了/少了 8 小时”的偏移问题。

# 问题根因
1. 数据库连接未显式固定会话时区，导致时间解释依赖运行环境或数据库默认配置。
2. API 返回时间字段时未统一为明确的 UTC 表达（ISO 8601），前后端在解析与展示时可能产生二次时区偏移。

# 变更内容
1. **固定数据库连接会话时区为 UTC**
   - 文件：`src/lib/db/index.ts`
   - 在 `postgres` 客户端初始化时增加：
     - `connection.TimeZone = 'UTC'`
   - 作用：确保当前服务发起的 DB 会话统一以 UTC 处理时间，避免依赖数据库实例默认时区。

2. **统一 API 时间返回格式为 UTC ISO 字符串**
   - 文件：`src/app/api/audit/route.ts`
     - 对审计日志返回的 `createdAt` 做统一转换：`toISOString()`
   - 文件：`src/app/api/admin/users/route.ts`
     - 对用户列表返回的 `createdAt`、`lastLoginAt` 做统一转换：`toISOString()`
   - 文件：`src/app/api/admin/users/[id]/route.ts`
     - 对单用户返回的 `createdAt`、`lastLoginAt` 做统一转换：`toISOString()`
   - 作用：建立明确的时间传输契约（UTC + ISO 8601），避免不同环境解析差异。

# 兼容性与影响评估
1. 该改动不改变接口字段名，仅统一字段值格式，前端现有 `new Date(...)` 解析逻辑可继续工作。
2. 该改动主要影响时间显示一致性，不改变业务权限、审计内容、用户 CRUD 行为。
3. 历史数据若曾在非 UTC 会话下写入，可能仍存在“已落库数据本身语义不一致”的情况，本次修复主要保障**修复后行为一致**。

# 验证建议
1. 在 DB 默认时区为 `Asia/Shanghai` 场景下启动服务，访问：
   - `/admin/audit`
   - `/admin/users`
2. 检查接口响应中时间字段是否为 UTC ISO 字符串（示例：`2026-06-07T08:00:00.000Z`）。
3. 对比页面展示时间与预期，确认不再出现额外 +8h 偏移。
4. 回归登录、审计写入、用户管理增删改查流程。

# 风险与回滚
1. 风险较低，范围集中在时间序列化与 DB 会话参数。
2. 如需回滚：
   - 撤销上述 4 个文件改动即可恢复原行为。

# 关联
- Issue: #4
