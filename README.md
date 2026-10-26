<div align="center">

![Semrush Quick Copy Banner](assets/banner.svg)

# Semrush Quick Copy

**Instant 1-click keyword & metric extraction from Semrush Keyword Magic Tool.**  
Export clean tabular data directly into Google Sheets, Excel, or CSV without manual copying.

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-9d4edd?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-7b2cbf?style=for-the-badge)](LICENSE)
[![Author](https://img.shields.io/badge/Made_With_❤️_By-r1fat-c77dff?style=for-the-badge)](https://r1fat.pages.dev)

</div>

---

### The Problem
When using a free Semrush account, you are granted **10 searches per day**. Each search renders only **10 visible keyword rows** (rows 11+ are paywalled/blurred). Native export options are locked behind paid subscriptions, forcing you to manually highlight, copy, and clean each keyword, volume, KD, and CPC one by one.

### The Solution
**Semrush Quick Copy** automatically reads the active 10 keyword rows directly from the rendered DOM in real time. With one click, it formats and copies clean tabular data (TSV) straight to your clipboard, ready to paste directly into Google Sheets or Excel with zero formatting hassle.

---

### Key Features

- **📊 1-Click Sheets / Excel Export (TSV)**: Instant copy with headers: `Keyword`, `Intent`, `Volume`, `KD %`, `CPC`, `Comp`, and `Freshness`.
- **📄 Comma-Separated Values (CSV)**: Standard CSV formatting for bulk processing or upload.
- **🔤 Plain Keywords List**: Line-by-line keyword list for SEO prompts, cluster analysis, or PPC campaign builders.
- **💾 Direct CSV File Download**: Save `.csv` directly to your local machine.
- **⚡ Dual Access**:
  - **In-Page Floating Pill**: Appears cleanly on the bottom-right of Semrush for instant zero-click access.
  - **Extension Toolbar Popup**: Open anytime to see a live preview card for each keyword with color-coded intent badges.
- **🔄 SPA & Dynamic Mutation Aware**: Automatically detects query changes when navigating between keywords without full-page reloads.
- **🎨 Deep Purple & Lavender Theme**: Sleek glassmorphic dark mode styling.

---

### Quick Installation

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/rifatlovescat/semrush-copy-extension.git
   ```
   *(Or download as a ZIP and extract the folder)*.

2. Open Google Chrome and go to:
   ```
   chrome://extensions/
   ```

3. Enable **Developer mode** using the toggle switch in the top-right corner.

4. Click the **Load unpacked** button in the top-left corner.

5. Select the `SemRush Copy Extension` directory.

---

### Usage

1. Open [Semrush Keyword Magic Tool](https://www.semrush.com/analytics/keywordmagic/) or any keyword search.
2. Search for any phrase (e.g. `penguin`).
3. Either:
   - Click the on-page floating widget: **"Copy for Sheets / Excel"**, OR
   - Click the extension icon in your Chrome toolbar.
4. Paste (`Ctrl + V` / `Cmd + V`) directly into your Google Sheet or Excel workbook.

---

<div align="center">

### Fixed Footer & Attribution

**Made With ❤️ By <a href="https://r1fat.pages.dev" target="_blank">r1fat</a>**

*(Visit [r1fat.pages.dev](https://r1fat.pages.dev))*

</div>
