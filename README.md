<div align="center">

![Semrush Quick Copy Banner](assets/banner.svg)

# Semrush Quick Copy

**Instant 1-click keyword & metric extraction from Semrush Keyword Magic Tool.**  
Export clean, color-styled tabular data directly into Google Sheets, Excel, or CSV with zero manual copying.

[![Version](https://img.shields.io/badge/Version-1.1.0-e0aaff?style=for-the-badge&logo=semver&logoColor=white)](CHANGELOG.md)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-9d4edd?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-7b2cbf?style=for-the-badge)](LICENSE)
[![Author](https://img.shields.io/badge/Made_With_❤️_By-r1fat-c77dff?style=for-the-badge)](https://r1fat.pages.dev)

</div>

---

### About The Project

**Semrush Quick Copy** was built to eliminate the tedious friction in daily SEO keyword research. 

When working on a free Semrush account, users are limited to **10 searches per day**, and each search displays only the **top 10 keywords** (with subsequent rows blurred behind a paywall). Because native bulk export features are gated behind paid subscriptions, researchers and marketers are forced to manually highlight, copy, and clean entries cell-by-cell.

This extension solves that problem directly inside the browser:
- **No Google Apps Script required.**
- **No external API keys or OAuth setups.**
- Uses modern **Rich Clipboard (`text/html` + `text/plain`)** injection, so pressing `Ctrl + V` in Google Sheets or Excel pastes a **fully color-formatted table** with bold deep-purple headers, intent badges, and Keyword Difficulty (KD%) heatmap coloring.

---

### Key Features

- **🎨 Direct Colored Google Sheets / Excel Paste**:
  - **Deep Purple Header**: `#2B0F52` background with crisp white typography.
  - **KD% Heatmap Coloring**: Automatically colors KD cells (Green = Very Easy, Yellow = Possible, Orange = Difficult, Red = Hard).
  - **Intent Badges**: Soft color-coded tags for Informational, Commercial, Transactional, and Navigational intents.
  - **Clean Borders & Striping**: Alternating row backgrounds with light gray cell dividers.
- **📄 Comma-Separated Values (CSV)**: Standard RFC-compliant CSV copy for bulk tools.
- **🔤 Plain Keywords List**: Line-by-line keyword text for prompt builders, cluster analysis, and PPC lists.
- **💾 Direct CSV File Download**: Instant `.csv` file export saved to your machine.
- **⚡ Dual Access**:
  - **Shadow DOM Floating Widget**: Encapsulated bottom-right pill with zero CSS leakage from Semrush.
  - **Extension Toolbar Popup**: Full card preview with live metrics and count badges.
- **🔄 SPA & Navigation Observer**: Detects keyword searches and tab switches in real-time without requiring full page reloads.

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
2. Search for any term (e.g. `penguin`).
3. Click either:
   - The on-page widget: **"Copy Styled (Colored Sheets)"**, OR
   - The extension icon in your toolbar.
4. Go to Google Sheets or Excel and press **`Ctrl + V`** (or `Cmd + V`).
5. Your spreadsheet is instantly filled with color-coded, formatted data!

---

### Releases & Versioning

Detailed release history and changelogs are maintained in [CHANGELOG.md](CHANGELOG.md).

- **[v1.1.0](https://github.com/rifatlovescat/semrush-copy-extension/releases/tag/v1.1.0)** - *Rich Colored Sheets Clipboard, Semrush KD% Heatmap, Shadow DOM Widget Isolation, & SVG bug fixes.*
- **[v1.0.0](https://github.com/rifatlovescat/semrush-copy-extension/releases/tag/v1.0.0)** - *Initial release with Manifest V3, dual access widget, and TSV/CSV exporters.*

---

### Tags & Topics

`#seo` `#semrush` `#chrome-extension` `#google-sheets` `#excel` `#keyword-research` `#data-extraction` `#growth-hacking` `#manifest-v3` `#productivity`

---

<div align="center">

### Fixed Footer & Attribution

**Made With ❤️ By <a href="https://r1fat.pages.dev" target="_blank">r1fat</a>**

*(Visit [r1fat.pages.dev](https://r1fat.pages.dev))*

</div>
