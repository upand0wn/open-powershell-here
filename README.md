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
| **Linux** | **Auto-detected** | On Ubuntu 25.10+ / 26.04, the system default terminal (Ptyxis) is used automatically |

On Linux the plugin detects an installed terminal automatically, including Ghostty, GNOME Terminal, GNOME Console, Konsole, Alacritty, Kitty, WezTerm, XFCE4 Terminal, and Foot. To always use a specific one, select it under **Style Settings → Preferred Terminal**.

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
- **Preferred Terminal (Linux)**: Choose Auto-detect, Ghostty, or Ptyxis when multiple terminals are installed.

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

## 📄 License

MIT License, see [LICENSE](LICENSE).
