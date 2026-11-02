/**
 * 一键启动 Web 端的浏览器打开器（由仓库根目录的 start-web.cmd 调用）。
 *
 * 用法：
 *   node scripts/dev-web-open.mjs --check   已在运行则退出码 0，否则 1（供 cmd 判断是否重复启动）
 *   node scripts/dev-web-open.mjs           轮询等待 Web 开发服务器就绪，然后打开默认浏览器
 *
 * 只使用 Node 内置能力（fetch / child_process），不引入任何依赖；等待期间不占用端口。
 */
import { spawn } from "node:child_process";

const URL = "http://localhost:7365/";
/** 首次启动要先跑 dev-prebuild（构建 workspace 依赖），给足 5 分钟。 */
const DEADLINE_MS = 5 * 60_000;
const INTERVAL_MS = 500;

const checkOnly = process.argv.includes("--check");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Web 开发服务器是否已经能响应；连接失败一律视为未就绪。 */
async function isUp() {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(1500) });
    // 页面返回 200；即便后端还没完全起来，只要 Vite 在监听就算就绪。
    return res.status < 500;
  } catch {
    return false;
  }
}

/** 交给系统默认浏览器打开；explorer.exe 不阻塞、不需要知道浏览器路径。 */
function openBrowser() {
  const child = spawn("explorer.exe", [URL], { detached: true, stdio: "ignore" });
  child.unref();
}

if (await isUp()) {
  if (!checkOnly) openBrowser();
  process.exit(0);
}
if (checkOnly) process.exit(1);

const startedAt = Date.now();
while (Date.now() - startedAt < DEADLINE_MS) {
  await sleep(INTERVAL_MS);
  if (await isUp()) {
    openBrowser();
    process.exit(0);
  }
}

console.error(
  "[NiceAgent] Web 开发服务器 5 分钟内未就绪，请查看当前窗口的控制台输出（首次启动需先安装依赖）。",
);
process.exit(1);
