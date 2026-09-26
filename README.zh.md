# Native Terminal Here

[English](README.md)

在 Obsidian 中直接打开本机终端，免去每次手动 `cd` 切换目录的繁琐操作。

- ⚡ **一键在仓库根目录打开终端**：点击左侧侧边栏的终端图标即可。
- 📂 **在任意文件夹/笔记所在目录打开**：在左侧文件树中右键任意文件夹或笔记文件，点击 **`Open Terminal here`**。

---

## 💻 支持的系统与终端

| 操作系统 | 终端 | 备注 |
| :--- | :--- | :--- |
| **Windows** | **PowerShell 7+** | 默认使用 Windows Terminal 窗口打开 |
| **Linux** | **自动检测** | Ubuntu 25.10+ / 26.04 自动使用系统默认终端（Ptyxis） |

Linux 下插件会自动检测本机已安装的终端，支持 Ghostty、GNOME Terminal、GNOME Console、Konsole、Alacritty、Kitty、WezTerm、XFCE4 Terminal、Foot 等。如需固定使用某一个，可在 **Style Settings → Preferred Terminal** 中选择。

---

## 🚀 使用方法

### 1. 从侧边栏打开（根目录）
点击 Obsidian 最左侧侧边栏（Ribbon）的 **终端图标**，直接在当前笔记库的根目录打开终端。

### 2. 从右键菜单打开（指定目录）
在左侧文件列表中：
- **右键文件夹**：点击 **`Open Terminal here`**，在被选中的文件夹中打开终端。
- **右键笔记文件**：点击 **`Open Terminal here`**，自动在**该文件所在的文件夹**中打开终端。

---

## ⚙️ 可选个性化设置（Style Settings）

如果你安装了 [Style Settings](https://obsidian.md/plugins?id=obsidian-style-settings) 插件，可以在其设置面板中进行个性化定制：

- **隐藏侧边栏图标**：不想看到左侧的终端图标时可一键隐藏（右键菜单功能不受影响）。
- **首选终端（Linux）**：当电脑中安装了多个终端软件时，可选择 Auto-detect、Ghostty 或 Ptyxis。

---

## 📦 安装方式

### 方式一：应用内市场安装（推荐）
1. 打开 Obsidian **设置** → **第三方插件** → **浏览**。
2. 搜索 **Native Terminal Here** 并点击 **安装**，随后 **启用** 即可。

### 方式二：手动安装
1. 从 [Releases 页面](https://github.com/upand0wn/open-powershell-here/releases) 下载 `main.js`、`manifest.json` 与 `styles.css`。
2. 将这 3 个文件放入你的笔记库目录 `<vault>/.obsidian/plugins/open-powershell-here/` 中。
3. 重新加载 Obsidian 并启用插件。

---

## 🔐 权限与安全

Obsidian 的自动审查会对本插件报告两项能力警告。二者都是“在指定目录打开终端”所必需的，且仅用于该目的。

| 能力 | 为什么需要 | 不会做什么 |
| :--- | :--- | :--- |
| **直接访问文件系统**（`node:fs`，仅 Linux） | 扫描 `PATH` 时检查终端程序是否存在且可执行（如 `ghostty`、`ptyxis`、`gnome-terminal`）。Windows 下改为通过隐藏的版本探测启动 `pwsh` 候选来验证。 | 不读取、不写入任何文件（vault 内外都不）；不会访问文件内容。 |
| **执行 shell 命令**（`child_process`） | 以独立进程启动所选终端：Windows 为 PowerShell 7+（可用时由 Windows Terminal 承载），Linux 为自动检测到的终端。 | 不使用 shell（`shell: false`）；不拼接命令字符串；目标目录作为独立参数并作为进程工作目录传递；绝不读取、写入或监听终端会话。 |

插件不联网、不上报遥测、不写日志。

---

## 📄 开源协议

MIT License，详见 [LICENSE](LICENSE)。
