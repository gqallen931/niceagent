# 为 NiceAgent 贡献代码

感谢你抽出时间为本项目做贡献。本文说明本地开发闭环、仓库约定，以及一个「好 PR」应该是什么样。

[English](CONTRIBUTING.md)

## 环境要求

- Node.js **24** 或更高版本
- pnpm **11**（用 `corepack enable` 获取固定版本最省事）
- Git

## 本地起步

```bash
git clone https://github.com/gqallen931/niceagent.git
cd niceagent
pnpm install
pnpm build          # 构建全部包，并链接 CLI
pnpm dev            # API 在 127.0.0.1:7368，Web App 在 127.0.0.1:7365
```

开发态 Web App 会把 `/api` 代理到开发服务器，因此登录、SSE 与 WebSocket 都是同源。开发端口
刻意不同于安装版服务端的 `7364`，这样发布版和源码检出可以同时运行。

常用入口：

```bash
pnpm niceagent --help        # 从源码运行 CLI（使用独立数据根 ~/.niceagent/dev-data-cli）
pnpm dev:server              # 只启动 API
pnpm dev:web                 # 只启动 Vite（要求 API 已在 7368）
```

## 仓库结构

| 路径 | 内容 |
| --- | --- |
| `packages/amsp` | 所有界面共享的记录协议 |
| `packages/core` | 智能体循环、接口、钩子、技能、插件加载器、轨迹写入 |
| `packages/server` | HTTP + SSE、鉴权、存储、会话运行时、终端、基准 |
| `packages/web` | React Web App |
| `packages/cli` | `niceagent` 命令 |
| `packages/skills` | SKILL.md 解析与 frontmatter 工具 |
| `packages/hmr` | 运行中平台的热更新原语 |
| `packages/ui` | 共享 UI 原语与设计令牌 |
| `plugins/*` | 内置插件库（技能、钩子、MCP 服务、工作台） |
| `benchmarks/*` | 基准用例与评分规则 |
| `scripts/*` | 构建、代码生成与仓库工具 |

依赖方向是 `web`/`cli` → `server` → `core` → `amsp`。内核不得导入服务端，服务端不得导入 Web App。

## 提交 PR 前的检查

```bash
pnpm format:check    # Prettier
pnpm lint            # oxlint
pnpm typecheck       # gen:ifaces + 各包 tsc
pnpm test            # vitest
pnpm build           # 全部包可构建
```

CI 会在 Linux、macOS 与 Windows 上运行同样的门禁。只改一个平台的变动，也必须让另外两个平台保持绿。

## 数据根

运行时写入的一切都在 `NICEAGENT_HOME`（默认 `~/.niceagent/data`）下：

- `pnpm dev` 与 `pnpm dev:server` 共用 `~/.niceagent/dev-data`。
- `pnpm niceagent` 使用 `~/.niceagent/dev-data-cli`，避免与开发服务器争抢锁。
- 测试使用临时数据根与内存数据库，不会碰你的真实数据。

测试时请通过界面删除会话或智能体，而不是直接删文件；然后读它的轨迹，理解引擎记录了什么。

## 插件

插件就是 `plugins/<name>` 下的普通 npm 包：

```json
{
  "name": "@niceagent/example",
  "version": "0.2.18",
  "niceagent": {
    "title": "Example",
    "category": "office-productivity",
    "skills": ["example"]
  }
}
```

评审会检查的规则：

- 技能的 `SKILL.md` frontmatter 必须带 `name`、`description` 与带日期的 `version`
  （`YYYY.MM.DD.N`）。安装会把文件复制走，版本号是「已安装副本知道内容变了」的唯一依据。
- 可安装的插件必须登记在分类清单里；若它包含平台预装的技能/钩子，还要登记在内置智能体预设中。
- 只有运维自行安装的插件会被宽松读取；内置插件读不出来必须带着路径大声失败。

## 提交与 PR 约定

- 一个 PR 只做一件事。重构和行为变更放在同一个 diff 里，等于两次评审。
- 提交信息正文写清「为什么」，而不只是「做了什么」。
- PR 描述里写清你运行了哪些命令、结果如何。
- 用户可见的变更要更新 `CHANGELOG.md`（新特性、修复、破坏性变更）。
- 行为变更要补测试：只涉及界面的测试放在组件旁，引擎测试放在 `packages/core/test`。

## 发布

由维护者从 `main` 发布：

1. 在 `CHANGELOG.md` 中把条目整理到新的版本标题下。
2. 提升每个 `package.json` 的版本号（所有包共用一个版本）。
3. 打 `vX.Y.Z` 标签并推送。
4. CI 构建并发布 Docker 镜像；npm 包从同一个提交执行 `pnpm -r publish`。

## 社区

- 使用问题：[GitHub Discussions](https://github.com/gqallen931/niceagent/discussions)
- Bug 与需求：GitHub issue（请使用模板）
- 安全问题：**绝不**公开提 issue —— 见 [SECURITY.zh.md](SECURITY.zh.md)

参与本项目即表示你同意[行为准则](CODE_OF_CONDUCT.zh.md)。

