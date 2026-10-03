# Native Terminal Here

[简体中文](README.zh.md)

Open your computer's native terminal directly from Obsidian without typing `cd <folder>` every time.

- ⚡ **Open at Vault Root**: Click the terminal icon in the left ribbon bar.
- 📂 **Open at Any Folder or File**: Right-click any folder or note in the file explorer and click **`Open Terminal here`**.

---

## 💻 Supported Platforms & Terminals

| Operating System | Terminal | Notes |
| :--- | :--- | :--- |
| **Windows** | **PowerShell 7+** | Hosted in modern Windows Terminal |
| **Linux** | **System default terminal** | No terminal is favoured; e.g. on Ubuntu 25.10+ / 26.04 the default terminal (Ptyxis) is used automatically |
| **macOS** | **Terminal.app** (Ghostty / Kitty optional) | ⚠️ **Not verified on a real Mac** — see the note below |

On Linux the plugin uses your system's default terminal first (via `xdg-terminal-exec`, or the Debian/Ubuntu `x-terminal-emulator` alternative). Only if no default can be determined does it fall back to the first installed terminal among Alacritty, Foot, Ghostty, GNOME Terminal, GNOME Console, Kitty, Konsole, Ptyxis, WezTerm, and XFCE4 Terminal (alphabetical, none favoured). To always use a specific one, select it under **Style Settings → Preferred Terminal**.

> ⚠️ **macOS support is untested.** The macOS code path is covered by automated tests only; it has **not been verified on a real Mac**. By default the plugin opens the built-in Terminal.app at the target folder; Ghostty or Kitty is used when selected under **Style Settings → Preferred Terminal** and installed in `/Applications` or `~/Applications`. If it does not work for you, please [open an issue](https://github.com/upand0wn/open-powershell-here/issues).

---

## 🚀 How to Use

### 1. Open at Vault Root (Ribbon Bar)
Click the **terminal icon** in Obsidian's left ribbon bar to open your terminal at the vault root directory.

### 2. Open at a Specific Folder (File Explorer)
In the left file tree:
- **Right-click any folder**: Click **`Open Terminal here`** to open the terminal in that folder.
- **Right-click any note/file**: Click **`Open Terminal here`** to open the terminal in the directory where that file is located.

---

## ⚙️ Optional Customization (Style Settings)

If you use the [Style Settings](https://obsidian.md/plugins?id=obsidian-style-settings) plugin, you can easily customize:

- **Hide Ribbon Button**: Hide the left ribbon icon if you only want the right-click menu.
- **Preferred Terminal (Linux / macOS)**: Choose Auto-detect, Ghostty, Kitty, or Ptyxis (Linux only) when multiple terminals are installed. If the selected terminal is not installed, the plugin falls back to auto-detection.

---

## 📦 Installation

### Option 1: Community Plugins (Recommended)
1. Open Obsidian **Settings** → **Community plugins** → **Browse**.
2. Search for **Native Terminal Here** and click **Install**, then **Enable**.

### Option 2: Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [Releases page](https://github.com/upand0wn/open-powershell-here/releases).
2. Place the 3 files into `<vault>/.obsidian/plugins/open-powershell-here/`.
3. Reload Obsidian and enable the plugin.

---

## 🔐 Permissions & Security

Obsidian's automated plugin review reports one capability warning for this plugin. It is inherent to opening a terminal at a folder, and it is limited to that purpose.

| Capability | Why it is needed | What it does **not** do |
| :--- | :--- | :--- |
| **Shell execution** (`child_process`) | Launches the selected terminal as a detached process: PowerShell 7+ on Windows (hosted in Windows Terminal when available), the terminal emulator on Linux, or the terminal app via `/usr/bin/open` on macOS. To find out which terminal is installed, candidates are simply started in order until one succeeds; on Windows `pwsh` candidates are verified with a hidden version probe, and on Debian/Ubuntu `update-alternatives --query x-terminal-emulator` is run to identify the default terminal. | No shell is involved (`shell: false`); no command strings are built; the target folder is passed as a separate argument and as the process working directory; the terminal session is never read, written, or monitored. |

The plugin does **not** use the Node.js `fs` module: it never reads, writes, or checks any file, inside or outside your vault.

The plugin does not connect to the network, does not collect telemetry, and does not write logs.

---

## 📄 License

MIT License, see [LICENSE](LICENSE).
