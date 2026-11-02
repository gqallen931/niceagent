/**
 * The release notes the App info dialog lists under "What's new", one entry per released version
 * (the shape and the rules for writing one are in `release-notes.ts`).
 *
 * Edited only at release preparation, in the commit that writes the release's `RELEASE.md`: add
 * one entry for the new version. Newest first by convention; the dialog sorts them either way.
 */
import type { ReleaseNote } from "./release-notes";

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: "0.2.18",
    date: "2026-11-02",
    zh: [
      "首个公开版本：一个通用、可自托管的智能体框架，包含推理内核、Web App、CLI 与评测中心。",
      "对话、工具调用与审批实时流式呈现，每次运行都有 Token 与成本核算。",
      "插件即 npm 包：技能、钩子、MCP 服务与工作台页面按 Agent 安装并独立版本化。",
      "会话、轨迹与工作区以文件形式保存在自己的数据根下，重启后可完整恢复。",
      "内置评测中心与四套沙箱后端，模型供应商与执行方式都可以自由替换。",
    ],
    en: [
      "The first public release: a general-purpose, self-hostable agent framework with a reasoning core, Web App, CLI and evaluation center.",
      "Conversations, tool calls and approvals stream in real time, with token and cost accounting for every run.",
      "Plugins are npm packages: skills, hooks, MCP servers and workbench pages install per agent and version independently.",
      "Sessions, traces and workspaces live as files under your own data root and restore completely after a restart.",
      "An evaluation center and four sandbox backends ship in the box; models and execution are yours to replace.",
    ],
  },
];
