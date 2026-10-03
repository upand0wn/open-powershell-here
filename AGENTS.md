# AGENTS.md — Native Terminal Here（open-powershell-here）项目约束

本文件记录本项目（Obsidian 插件 `open-powershell-here`，显示名 **Native Terminal Here**）的核心约束。任何 Agent 在继续本项目前必须完整阅读并遵守本文件；如与本文件冲突，以本文件为准；如与用户最新明确指示冲突，以用户指示为准并在提交前说明。

最后核对：2026-10-03（v0.7.0）。

## 项目本质

- 桌面 Obsidian 插件（`isDesktopOnly`），提供**两个入口**（2026-08-09 用户明确批准的约束变更，覆盖旧的“Ribbon 唯一入口”约束）：
  1. **Ribbon 按钮**：在 vault 根目录打开本机终端；
  2. **单文件夹右键菜单**（Obsidian 左侧文件列表中右键单个文件夹或普通文件，菜单项 **`Open Terminal here`**、图标 `terminal`）：文件夹以自身路径打开，文件以其所在文件夹打开。
- 终端按平台分派（`src/terminals/manager.ts`）：
  - **Windows**：PowerShell 7+（`pwsh.exe`），默认以 `wt.exe`（Windows Terminal）作为窗口宿主；
  - **Linux**：**不偏向任何终端，优先使用系统默认终端**（2026-10-03 用户明确指示，覆盖此前的 Ghostty 优先）。顺序为 `xdg-terminal-exec → x-terminal-emulator → alacritty → foot → ghostty → gnome-terminal → kgx → kitty → konsole → ptyxis → wezterm → xfce4-terminal`（前两项为系统默认机制，其余按 id 字母顺序）。`x-terminal-emulator` 命中时 finder 用 `realpath` 跟随链接（去掉 `.wrapper` 后缀），若指向候选列表中的终端则改用该终端自身的工作目录参数启动，否则仅靠 `cwd`。Ubuntu 25.10+/26.04 通过 `xdg-terminal-exec --dir=<dir>` 跟随系统默认终端（默认 Ptyxis）。
  - **macOS**（2026-10-03 用户明确要求新增，**未在真实 Mac 上验证**）：通过 `/usr/bin/open` 启动应用包，候选顺序 `Terminal.app → Ghostty → Kitty`；Auto-detect 使用系统自带 Terminal.app，Ghostty / Kitty 仅在 Preferred Terminal 选中且已安装时使用。README 中“未在 macOS 验证”的声明在用户确认实机通过前**不得删除**。
- **Ribbon 按钮只允许隐藏、不允许移除**（2026-08-10 用户明确指示）：
  - `styles.css` 的 `@settings` 块只保留**两个扁平设置项**：**Hide the ribbon button**（`class-toggle`）与 **Preferred Terminal**（`class-select`），**不得添加分组标题**（2026-09-26 用户明确指示，此前的 “Ribbon Button” / “Terminal Selection (Linux)” 两个 heading 已删除）。
  - **关键机制（踩坑后确认，读 Style Settings 源码验证）**：`class-toggle` 加到 `<body>` 的类名是**设置项 `id`**（`SettingsManager.ts` 中 `document.body.classList.add(setting.id)`；`addClass` 属性已被新版 Style Settings 忽略）。因此 `id` 必须等于想要匹配的 body 类名，CSS 选择器与 `main.ts` 的 `HIDE_RIBBON_BODY_CLASSES` 常量必须保持一致。
  - **双重保障**：CSS 双选择器（`.vault-terminal-ribbon` / `.vault-powershell-ribbon` + tooltip `aria-label` 匹配，`display: none`）；同时 `main.ts` 用 `MutationObserver` 监听 body class 变化，以内联样式强制隐藏/恢复按钮（不依赖任何 CSS/DOM 假设）。
  - 安装文档必须要求复制 `styles.css`。不得删除 Ribbon 入口，不得把隐藏做成硬编码（必须可切换）。
- **Preferred Terminal 选项固定为 `Auto-detect` / `Ghostty` / `Kitty` / `Ptyxis` 四项**（2026-09-26 用户指示三项，2026-10-03 用户明确要求加入 Kitty）；代码中的其他终端候选保留用于自动检测与回退，**所选终端未安装时自动回退到候选顺序**。
- 仍禁止：命令面板命令、快捷键、设置页、批量（多选）右键菜单（`files-menu`）、内嵌终端、自动执行脚本。
- 插件 ID：`open-powershell-here`（**安装/更新键，永不更改**；2026-08-10 与显示名/仓库名统一，此前为 `vault-powershell`）；显示名 **Native Terminal Here**；主类：`VaultTerminalPlugin`（内部实现名，不改）；当前版本 `0.7.1`；仓库 **Public**；默认分支 `main`。
- 内部 CSS hook class（`vault-terminal-ribbon`、`vault-powershell-ribbon`、`hide-vault-terminal-ribbon`、`hide-vault-powershell-ribbon`）与插件 id 无关，保持原样（无用户可见影响）。

## 硬性约束（不可违反）

### 通用

1. 路径解析全部走 `FileSystemAdapter` + `instanceof` 运行时检查：vault 根路径用 `getBasePath()`；文件夹路径用 `getFullPath(folder.path)`（vault 根文件夹 path 为 `''` 时用 `getBasePath()`）；不反推、不读笔记、不改 vault。
2. 目标路径只作为**独立进程参数**与 `cwd` 传递；不得把路径拼进命令字符串；禁止 `shell: true`、批处理/脚本包装器。
3. **不修改真实 vault**；测试只使用项目内 `.test-vault/`（gitignore）；`npm run install:test` 只复制 `main.js`/`manifest.json`/存在的 `styles.css`，并幂等写入 `community-plugins.json`。
4. **不联网、不遥测、不上传**；不写日志文件；不监听/记录终端会话；vault 路径只作为进程参数与 `cwd` 使用。
5. 内存缓存（已解析终端）只存在于内存，Ribbon 与右键菜单**共用同一个 finder 实例（同一缓存、同一单飞锁）**；正式启动 `ENOENT` 时：Windows 清缓存并**最多重试一次**；Linux / macOS 的 finder 通过 `reject()` 跳过该候选并依次尝试下一个，全部失败才报 not found（下次点击重新从头尝试）；缓存后每次点击任一入口都开新窗口、无冷却。
6. 若无法实现可靠交互窗口，必须**如实报告**（实现、表现、原因、代码状态、约束冲突），不得用被禁止的程序悄悄绕过，不得把 mock 测试说成真实窗口验证。

### Windows

7. **只直接创建经过版本验证的 `pwsh.exe`**（主版本 ≥ 7，通过隐藏探测验证）；**禁止调用或间接调用** `powershell.exe`、`cmd.exe`、`conhost.exe`、Windows `start`、WSL、Git Bash；禁止回退到 Windows PowerShell 5.1；禁止自动下载/安装/更新 PowerShell；不搜索整个磁盘，不遍历 WindowsApps。
8. **例外（用户明确授权，2026-08-08）**：正式会话允许以 `wt.exe`（Windows Terminal）作为控制台窗口宿主，让 pwsh 获得真实控制台句柄。授权范围仅限于：wt 只作为窗口宿主，不代理/监听/记录任何输入输出；目标路径仍作为独立 `-WorkingDirectory` 参数传递；`wt.exe` 缺失（ENOENT）时回退直连 `spawn(pwsh, …, stdio:'inherit')`。
9. **分号路径（用户明确变更，2026-08-09）**：目标路径包含 `;` 时**不创建任何进程**（包括版本探测），显示 Notice `PowerShell cannot be opened for paths containing a semicolon (;).`。
10. 正式会话：不使用 `-NoProfile`/`-NonInteractive`/`-Command`（仅允许出现在隐藏版本探测中）；不自动执行任何命令；正常加载用户 Profile。

### Linux

11. 只启动候选列表中的终端或系统默认终端；参数必须由 `buildArgs` 生成并作为独立参数传递（如 `--working-directory=<dir>`、`xdg-terminal-exec --dir=<dir>`、Ptyxis 的 `--new-window --working-directory=<dir>`），不得改用 shell 字符串或包装脚本。
12. **不得使用 `node:fs`（2026-10-03 用户要求消除市场的 Direct Filesystem Access 警告）**：Linux finder 不扫描 `PATH`、不检查文件，只按候选顺序给出**裸程序名**（由系统在 `spawn` 时按 `PATH` 解析），启动 `ENOENT` 即视为未安装并换下一个；`x-terminal-emulator` 的真实指向通过无 shell 的 `update-alternatives --query x-terminal-emulator`（读取 `Value:` 字段）识别，查询失败则直接启动该链接。
13. `xdg-terminal-exec` 必须保持候选列表第一位、`x-terminal-emulator` 第二位，其余终端按 id 字母顺序排列；不得把任何具体终端排到系统默认机制之前，不得在文案中“推荐”某个终端，不得破坏“跟随系统默认终端”的行为，除非用户明确要求。

### macOS

14a. 只通过 `/usr/bin/open` 启动候选列表中的应用包（`open` 仅作为启动器，类比 Windows 的 `wt.exe`）；参数由 `buildArgs(appPath, dir)` 生成并作为独立参数传递；不得使用 `osascript` / AppleScript、shell 字符串或包装脚本。应用包只在 `/Applications`、`/System/Applications/Utilities`、`/System/Applications`、`~/Applications` 这几个固定路径中尝试，不搜索整个磁盘；**不做 `node:fs` 存在性检查**，而是直接用 `open -a <应用包完整路径>` 尝试并等待 `open` 退出，非零退出码视为该路径下未安装（按 `ENOENT` 处理，换下一个路径/候选）。

### 右键菜单

14. 只监听公开 `file-menu` 事件（`this.registerEvent(this.app.workspace.on('file-menu', ...))` 管理生命周期，禁用/重载/重启用后不得重复注册）；对目标做可靠的 `instanceof TFolder` / `instanceof TFile` 运行时检查，仅对**单个**目标添加菜单项；菜单项标题 `Open Terminal here`、图标 `terminal`；目标路径在**点击菜单项时**解析（不在菜单构建阶段固定）；不依赖内部菜单 section 名称；非支持平台、非 `FileSystemAdapter` 不显示菜单项；**不注册 `files-menu`**（不支持多选）。

## 平台行为发现

### Windows（2026-08-06 至 2026-08-08，Windows + pwsh 7.6.4 + Node 24 实测）

- 从无控制台的 GUI 父进程（如资源管理器启动的 Obsidian）用 Node `spawn` 直接创建 `pwsh.exe`：`stdio:'ignore'` → NUL 句柄（pwsh 立即退出）；`stdio:'inherit'` → INVALID_HANDLE_VALUE（libuv `process-stdio.c`：无效 fd ≤2 时传 INVALID_HANDLE_VALUE，且 `STARTF_USESTDHANDLES` 恒置位 → pwsh 立即退出）；管道 → pwsh 挂起且不可交互。**真实用户点击确认：窗口闪退。**
- 父进程有控制台（终端启动的 Obsidian）时，直连 `stdio:'inherit'` → pwsh 附加到同一控制台，完全可交互（`IsInputRedirected=False` 已实测）。
- `conhost.exe pwsh …` 方案实测**参数丢失**（pwsh 以无参数启动），不可用；`wt.exe` 的 `-d`/`-WorkingDirectory` 均会被 `;` 拆分（wt 命令分隔符），`&`/空格/括号/单引号/中文路径均实测安全。
- **`wt.exe` 宿主方案（已授权、已实测）**：从无控制台（DETACHED 模拟）父进程 `spawn('wt.exe', ['-w','0', pwshPath, '-WorkingDirectory', targetDir])` → pwsh `IsInputRedirected=False`（真实控制台句柄、完全可交互）、`-WorkingDirectory` 安全送达特殊字符路径、会话独立于父进程存活。
- 因此正式会话采用：默认 `wt.exe` 宿主（`stdio:'ignore'`，wt 是启动器，句柄无关）；`wt.exe` ENOENT 时回退直连 `spawn(pwsh, …, stdio:'inherit')`。**目标路径含 `;` 时不启动任何进程（2026-08-09 用户变更，见硬性约束 9）。不得把宿主模式改回直连作为默认，也不得用 `cmd.exe`/`conhost.exe`/`shell:true`。**
- 真实 Obsidian GUI 人工验收：Ribbon 的 wt 宿主版本（2026-08-08）与文件夹右键菜单入口（2026-08-09）用户均已实测确认可用（`.test-vault`）；分号报错等边缘项仍待验证。`MANUAL_TESTS.md` 未执行项保持“未执行/not performed”，不得伪造。

### Linux / Ubuntu（2026-09-26，Ubuntu 26.04.1 LTS + Ptyxis 50.1 实测）

- `/usr/bin/x-terminal-emulator` → `/etc/alternatives/x-terminal-emulator` → `/usr/bin/ptyxis`；旧版插件仅经该兜底启动 ptyxis，不带工作目录参数，可能落在 home。
- `xdg-terminal-exec`（`/usr/bin/xdg-terminal-exec`）是 Ubuntu 25.04+ 的默认终端解析机制：`--print-id` 输出 `org.gnome.Ptyxis.desktop:new-window`，`--print-cmd --dir=<dir>` 输出 `ptyxis --new-window --working-directory <dir>`；系统默认配置位于 `/usr/share/xdg-terminal-exec/ubuntu-xdg-terminals.list` 或 `~/.config/ubuntu-xdg-terminals.list`。
- 实测（与插件 launcher 相同参数）`spawn('/usr/bin/xdg-terminal-exec', ['--dir=<dir>'], { cwd, detached: true, stdio: 'ignore' })` 可正常启动。
- Linux 人工验收清单见 `MANUAL_TESTS.md` 的 L1–L11；未执行项不得伪造为通过。

### macOS（2026-10-03，无实机）

- 全部实现基于文档与通用经验，**没有任何实机事实**；人工验收清单见 `MANUAL_TESTS.md` 的 M1–M6，全部未执行。

## 质量与流程

- 每次改动后、回复用户前必须依次完成：
  1. `npm run verify`（lint → typecheck → test → build）通过；
  2. 确认 `main.js` 已重新构建且与源码一致（CI 同样检查 `git diff --exit-code -- main.js`）；
  3. 检查并同步中英文 README（`README.md` 英文为默认、`README.zh.md` 简体中文）、`MANUAL_TESTS.md`、manifest 与 GitHub About/Topics（事实变化才改，不制造无意义差异）；
  4. 检查暂存区无敏感文件（`.env`、token、凭据、`.test-vault`、node_modules、日志）；
  5. `git add -A`；有变化才提交（Conventional Commits，如 `feat:`/`fix:`/`test:`/`docs:`/`chore:`）；无变化不得空提交；
  6. 推送 `main`（本机推送方式见 `AGENTS.local.md`，不提交）；确认远端 HEAD 与本地一致；`git status` 干净后才回复。
- **禁止**：`git push --force` / `--force-with-lease`、改写已推送历史、删除远端分支、覆盖/删除已有远端、跳过 Git hooks、提交凭据。
- 推送与发布由维护者执行（维护者本地运维细节见 `AGENTS.local.md`，该文件不提交、不进入公开仓库）。
- 构建或测试失败时不得创建声称“已完成”的提交；用户要求保存进度时可提交 WIP 并明确说明。
- 自动化验证、构建、真实 GUI 验证（Windows / Ubuntu）、Git 提交、GitHub 推送、README/About 同步、Release 发布必须分开如实报告，不得笼统声称“全部完成”。

## 发布流程（2026-09-26 更新）

- 版本发布（版本号 / tag / Release / `versions.json` 更新）**只在用户明确要求时进行**；功能需经用户实机确认后再发布；普通提交不升版本、不打 tag、不发 Release。
- 版本号遵循 SemVer：新功能 → minor（如 `0.5.1 → 0.6.0`）；修复 / 文档 / 杂项 → patch；**不跳号、不回退**。
- 发版步骤：
  1. 更新 `manifest.json` 的 `version`、`package.json` 的 `version`、`package-lock.json` 顶部两处 `name` / `version`（只手改这两处，不要用 `npm install --package-lock-only` 重写，否则会丢失依赖的 `libc` 字段），并在 `versions.json` 顶部加入 `"X.Y.Z": "<minAppVersion>"`；
  2. `npm run verify` 通过，确认 `main.js` 已重建并提交；
  3. 提交 `chore: prepare vX.Y.Z release`，推送 `main`，确认远端 HEAD 与本地一致；
  4. 触发 Release workflow（`.github/workflows/release.yml`，二选一；**推荐与历史一致的方式 A**）：
     - A：`gh workflow run release.yml -f tag_name=X.Y.Z`；
     - B：`git tag X.Y.Z && git push origin X.Y.Z`。
     - **tag 名必须与 manifest 版本完全一致（不带 `v` 前缀）**；workflow 会执行 verify + 构建证明（attestation）并上传 `main.js`/`manifest.json`/`styles.css`；
  5. 发布后验证：`gh release view X.Y.Z`（非 draft、非 prerelease、三个附件齐全）；tag 指向版本提交；CI（`ci.yml`，`windows-latest` + `ubuntu-latest`）全绿。
- 社区市场（**2026-09-26 起的新流程，不再向 `obsidianmd/obsidian-releases` 提 PR**）：
  - 该仓库现在是 [community.obsidian.md](https://community.obsidian.md) 目录的自动镜像；
  - 目录从**仓库默认分支的 `manifest.json`** 读取最新版本，安装/更新时从 **tag 与 manifest 版本一致的 GitHub Release** 拉取三件套；README 从仓库默认分支展示。因此**发完 Release 即自动生效**（目录站点展示可能有数小时延迟，用户端 Obsidian 直接读仓库 manifest + release，无需等待）；
  - 列表搜索使用的 `name` / `description` 等元数据在 **community.obsidian.md** 后台用 Obsidian 账号登录后编辑，**不会**自动跟随仓库 manifest；首次提交/审核状态也在该站查看；
  - “This plugin has not been manually reviewed by Obsidian staff” 是官方审核状态展示，不影响安装与更新；
  - 目录的自动审查会对 `child_process`（启动终端进程）报告 **Shell Execution** 能力警告：这是插件核心功能所必需，无法消除，**不得为消除警告而移除功能，也不得用混淆等手段规避检测**；必须在 `README.md` / `README.zh.md` 的 “Permissions & Security / 权限与安全” 章节如实说明。**Direct Filesystem Access** 警告已通过移除全部 `node:fs` 用法消除（见硬性约束 12、14a），不得重新引入 `node:fs`；
  - 社区公告（论坛 Share & showcase、Discord `#updates`）可选，不属于发版流程必选项。

## 参考文件

- `MANUAL_TESTS.md`：真实验收清单（Windows 清单 + Linux/Ubuntu L1–L11 + macOS M1–M6）与平台行为发现；未执行项保持“未执行”。
- `README.md`（英文，默认）/ `README.zh.md`（简体中文）：用户文档，必须同步（两文件仅在语言与互链上不同）。
- `AGENTS.local.md`：维护者本地运维指引（deploy key、推送/发布命令），**不提交**（已 gitignore），仅本机工作区存在。
- `.github/workflows/ci.yml`：CI（`windows-latest` + `ubuntu-latest` 矩阵；lint/typecheck/test/build + `main.js` 同步检查）。
- `.github/workflows/release.yml`：Release workflow（tag push 或 workflow_dispatch；verify + attestation + 上传三件套）。
- `src/`：`main.ts`（生命周期、Ribbon、右键菜单、Notice）、`vault-path.ts`（路径解析）、`terminals/manager.ts`（平台分派、偏好终端）、`terminals/types.ts`、`terminals/windows/{candidates,version-probe,launcher,finder,types}.ts`、`terminals/linux/{candidates,finder,launcher,alternatives,types}.ts`、`terminals/macos/{candidates,finder,launcher,types}.ts`、`terminals/spawn-detached.ts`（Linux 的分离进程启动）。
- `styles.css`：Style Settings `@settings` 块（Hide the ribbon button + Preferred Terminal）与隐藏 Ribbon 的 CSS。
- `tests/`：Vitest 测试；`tests/mocks/obsidian.ts` 是 `obsidian` 包（仅类型）的测试替身（见 `vitest.config.ts` 别名）。
- `scripts/install-test.mjs`：`npm run install:test`，把构建产物装入 `.test-vault` 并幂等注册到 `community-plugins.json`。
