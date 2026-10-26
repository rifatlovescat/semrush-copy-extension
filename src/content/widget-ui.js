/**
 * Semrush Quick Copy - In-Page Floating Widget UI
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  window.SQC = window.SQC || {};

  let shadowRoot = null;
  let toastTimer = null;

  function showToast(message, isError = false) {
    if (!shadowRoot) return;
    const toastEl = shadowRoot.querySelector('#sqc-toast');
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.className = 'sqc-toast show' + (isError ? ' error' : '');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.className = 'sqc-toast';
    }, 2800);
  }

  function renderWidget(keywords, query, onAutoKgrRequested) {
    let container = document.getElementById('sqc-floating-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sqc-floating-root';
      document.body.appendChild(container);
      shadowRoot = container.attachShadow({ mode: 'open' });
    }

    const count = keywords.length;
    const displayQuery = query || 'Keyword Magic Tool';
    const isChecking = window.SQC.KgrRunner ? window.SQC.KgrRunner.isRunnerBusy() : false;

    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          line-height: 1.3 !important;
          box-sizing: border-box !important;
        }

        *, *::before, *::after {
          box-sizing: border-box !important;
          margin: 0;
          padding: 0;
        }

        .widget-box {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2147483647;
          width: 250px;
          background: linear-gradient(145deg, #16082e 0%, #2b0f52 100%);
          border: 1px solid rgba(224, 170, 255, 0.35);
          border-radius: 14px;
          box-shadow: 0 10px 32px rgba(10, 2, 22, 0.75), 0 0 18px rgba(157, 78, 221, 0.3);
          padding: 12px 14px 10px 14px;
          color: #fcedff;
          display: flex;
          flex-direction: column;
          gap: 9px;
          backdrop-filter: blur(14px);
          animation: sqc-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes sqc-fade-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 2px;
        }

        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #55f38e;
          border-radius: 50%;
          box-shadow: 0 0 8px #55f38e;
          display: inline-block;
        }

        .brand-title {
          font-weight: 700;
          font-size: 12px;
          color: #ffffff;
          letter-spacing: 0.3px;
        }

        .count-pill {
          background: rgba(199, 125, 255, 0.22);
          border: 1px solid rgba(224, 170, 255, 0.45);
          color: #fcedff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 10px;
        }

        .query-box {
          background: rgba(22, 8, 46, 0.65);
          border: 1px solid rgba(199, 125, 255, 0.18);
          border-radius: 8px;
          padding: 5px 8px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 5px;
          overflow: hidden;
        }

        .query-lbl {
          color: #c77dff;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
        }

        .query-txt {
          color: #ffffff;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .actions-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .btn-main {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 10px;
          background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%);
          border: 1px solid rgba(252, 237, 255, 0.4);
          border-radius: 8px;
          color: #ffffff;
          font-weight: 700;
          font-size: 11.5px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(123, 44, 191, 0.45);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .btn-main:hover {
          background: linear-gradient(135deg, #9d4edd 0%, #c77dff 100%);
          box-shadow: 0 6px 18px rgba(199, 125, 255, 0.55);
          transform: translateY(-1px);
        }

        .btn-main:active {
          transform: translateY(0);
        }

        .btn-kgr {
          background: rgba(56, 18, 102, 0.75);
          border: 1px solid rgba(199, 125, 255, 0.35);
          color: #fcedff;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .btn-kgr:hover {
          background: rgba(85, 28, 155, 0.9);
          border-color: rgba(224, 170, 255, 0.6);
          color: #ffffff;
        }

        .btn-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .btn-sub {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 600;
          color: #fcedff;
          background: rgba(38, 14, 75, 0.7);
          border: 1px solid rgba(199, 125, 255, 0.22);
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-sub:hover {
          background: rgba(65, 24, 115, 0.9);
          border-color: rgba(224, 170, 255, 0.5);
          color: #ffffff;
        }

        .fixed-footer {
          text-align: center;
          font-size: 11px;
          color: #bfa7d9;
          padding-top: 7px;
          border-top: 1px solid rgba(199, 125, 255, 0.16);
          margin-top: 2px;
        }

        .r1fat-link {
          color: #e0aaff !important;
          font-weight: 700;
          text-decoration: none !important;
          cursor: pointer;
          display: inline-block;
          text-shadow: 0 0 6px rgba(224, 170, 255, 0.8), 0 0 14px rgba(199, 125, 255, 0.6);
          animation: neon-glow 2s ease-in-out infinite alternate;
          transition: transform 0.2s ease;
        }

        .r1fat-link:hover {
          color: #ffffff !important;
          text-shadow: 0 0 10px #fcedff, 0 0 20px #e0aaff, 0 0 30px #c77dff;
          transform: scale(1.08);
        }

        @keyframes neon-glow {
          0% {
            color: #e0aaff;
            text-shadow: 0 0 4px rgba(224, 170, 255, 0.6);
          }
          50% {
            color: #fcedff;
            text-shadow: 0 0 8px rgba(252, 237, 255, 0.9), 0 0 16px rgba(224, 170, 255, 0.8);
          }
          100% {
            color: #e0aaff;
            text-shadow: 0 0 4px rgba(224, 170, 255, 0.6);
          }
        }

        .sqc-toast {
          position: absolute;
          top: -38px;
          left: 50%;
          transform: translateX(-50%) translateY(8px);
          background: #180533;
          border: 1px solid #c77dff;
          color: #fcedff;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7);
          opacity: 0;
          pointer-events: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sqc-toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .sqc-toast.error {
          border-color: #ff6b6b;
          color: #ffe3e3;
        }
      </style>

      <div class="widget-box">
        <div id="sqc-toast" class="sqc-toast">Copied!</div>

        <div class="header-row">
          <div class="brand-wrap">
            <span class="pulse-dot"></span>
            <span class="brand-title">Semrush Quick Copy</span>
          </div>
          <span class="count-pill">${count} Found</span>
        </div>

        <div class="query-box">
          <span class="query-lbl">Target:</span>
          <span class="query-txt" title="${displayQuery}">"${displayQuery}"</span>
        </div>

        <div class="actions-col">
          <button type="button" class="btn-main" id="btn-tsv" title="Copies styled colored table with KGR formulas ready to paste into Google Sheets">
            <span>📋</span>
            <span>Copy for Sheets (KGR)</span>
          </button>

          <button type="button" class="btn-main btn-kgr" id="btn-auto-kgr" title="Auto-queries Google allintitle count for all 10 keywords">
            <span>⚡</span>
            <span>${isChecking ? 'Checking KGR...' : 'Auto-Check KGR (Google)'}</span>
          </button>

          <div class="btn-row">
            <button type="button" class="btn-sub" id="btn-csv" title="Download CSV file directly">Download CSV</button>
            <button type="button" class="btn-sub" id="btn-list" title="Copy plain keyword list">List Only</button>
          </div>
        </div>

        <div class="fixed-footer">
          Made With ❤️ By <a href="https://r1fat.pages.dev" target="_blank" rel="noopener noreferrer" class="r1fat-link">r1fat</a>
        </div>
      </div>
    `;

    // Connect handlers
    const btnTsv = shadowRoot.querySelector('#btn-tsv');
    const btnAutoKgr = shadowRoot.querySelector('#btn-auto-kgr');
    const btnCsv = shadowRoot.querySelector('#btn-csv');
    const btnList = shadowRoot.querySelector('#btn-list');

    btnTsv?.addEventListener('click', () => {
      if (!keywords.length) return showToast('No keywords detected yet', true);
      window.SQC.Formatters.copyRichTable(keywords)
        .then(() => showToast(`✨ Copied ${keywords.length} KGR rows for Sheets!`))
        .catch(() => showToast('Copy failed', true));
    });

    btnAutoKgr?.addEventListener('click', () => {
      if (onAutoKgrRequested) onAutoKgrRequested();
    });

    btnCsv?.addEventListener('click', () => {
      if (!keywords.length) return showToast('No keywords detected yet', true);
      try {
        window.SQC.Formatters.downloadCsvFile(keywords, displayQuery);
        showToast(`💾 Downloaded ${keywords.length} as CSV!`);
      } catch (err) {
        window.SQC.Formatters.copyPlainText(window.SQC.Formatters.formatAsCSV(keywords))
          .then(() => showToast(`📄 Copied ${keywords.length} as CSV!`))
          .catch(() => showToast('Download failed', true));
      }
    });

    btnList?.addEventListener('click', () => {
      if (!keywords.length) return showToast('No keywords detected yet', true);
      window.SQC.Formatters.copyPlainText(window.SQC.Formatters.formatKeywordsOnly(keywords))
        .then(() => showToast(`🔤 Copied ${keywords.length} plain keywords!`))
        .catch(() => showToast('Copy failed', true));
    });
  }

  window.SQC.WidgetUI = {
    renderWidget,
    showToast
  };
})();
