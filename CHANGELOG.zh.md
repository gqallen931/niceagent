# 更新日志

NiceAgent 的所有重要变更都记录在此。格式遵循
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

## [0.2.18] — 2026-11-02

NiceAgent 的首个公开版本：一个通用、可自托管的智能体框架。

### 新增

- **内核**（`@niceagent/core`）：基于 AMSP 记录的流式智能体循环，可替换的 `LLMInterface` /
  `EnvironmentInterface`，并发工具执行、逐次调用审批、打断、自动重连与上下文压缩。
- **协议**（`@niceagent/amsp`）：SDK、服务端、CLI 与 Web App 共享的记录类型与标记。
- **服务端**（`@niceagent/server`）：Hono HTTP + SSE、多用户鉴权、项目级授权、会话运行时、
  定时任务、服务端 pty 终端、用量核算、轨迹、插件安装与基准执行。
- **Web App**（`@niceagent/web`）：聊天、智能体、插件、模型、机器、成本中心、评测中心、
  组织模式、工作台与独立终端。
- **CLI**（`@niceagent/cli`）：`niceagent`，包含 REPL、单次任务、配置、会话/智能体/项目管理、
  成本、定时任务、智能体浏览器以及 `niceagent web`。
- **插件库**：29 个插件包——技能、钩子、MCP 服务与工作台页面——随版本发布，按智能体安装。
- **评测中心**：带评分规则的基准用例、逐用例轨迹与记分板。
- **沙箱后端**：`bwrap`、`seatbelt`、`WSL` 与 `DSH` 约束工具执行。
- **部署**：多阶段 Dockerfile、compose 文件与首次启动管理员认领流程。

### 变更

- 暂无——这是首个版本。

### 修复

- 暂无——这是首个版本。

### 安全

- `scrypt` 密码哈希、会话令牌哈希存储、同源写请求校验、流式 WebSocket 的 `Origin` 校验，
  以及按需开启的沙箱化工具执行。

[未发布]: https://github.com/gqallen931/niceagent/compare/v0.2.18...HEAD
[0.2.18]: https://github.com/gqallen931/niceagent/releases/tag/v0.2.18
