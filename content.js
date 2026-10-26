/**
 * Semrush Quick Copy - Content Script (V3 - Rich Styled Clipboard for Google Sheets)
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  // State
  let cachedKeywords = [];
  let currentQuery = '';
  let widgetHost = null;
  let shadowRoot = null;
  let toastTimer = null;

  /**
   * Extract current search query from URL or search input
   */
  function getSearchQuery() {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    if (qParam && qParam.trim()) return qParam.trim();

    const searchInput = document.querySelector('input[data-test="searchbar_input"]') ||
                        document.querySelector('input[name="q"]') ||
                        document.querySelector('input[type="search"]');
    return searchInput && searchInput.value ? searchInput.value.trim() : '';
  }

  /**
   * Scrape active keyword rows with robust selectors
   */
  function extractKeywords() {
    const rows = document.querySelectorAll('div[data-testid="table-row"], div.sm-table-layout__row, div[role="row"]');
    const items = [];

    rows.forEach((row) => {
      // 1. Identify keyword anchor / text
      const kwAnchor = row.querySelector('[data-testid="table-cell-keyword"] a') ||
                       row.querySelector('.sm-cell-phrase__link') ||
                       row.querySelector('a[href*="/keywordoverview/"]') ||
                       row.querySelector('[data-ui-name="Checkbox.Text"]');
      
      // If no keyword anchor exists, this is a skeleton/locked row or header
      if (!kwAnchor) return;

      const keyword = kwAnchor.textContent.trim();
      if (!keyword || keyword.toLowerCase() === 'keyword') return;

      // 2. Check if the checkbox is explicitly disabled (Semrush paywall row indicator)
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox && checkbox.disabled) return;

      // 3. Skip locked container if marked
      if (row.classList.contains('sm-table-row-layout__locked')) return;

      // 4. Extract Intent
      let intent = 'Informational';
      const intentEl = row.querySelector('[data-testid="table-cell-intent"]');
      if (intentEl) {
        const btn = intentEl.querySelector('[aria-label]');
        if (btn) {
          intent = btn.getAttribute('aria-label').replace(/\.\s*Apply filter/i, '').trim();
        } else {
          const raw = intentEl.textContent.trim();
          if (raw === 'I') intent = 'Informational';
          else if (raw === 'C') intent = 'Commercial';
          else if (raw === 'T') intent = 'Transactional';
          else if (raw === 'N') intent = 'Navigational';
          else if (raw) intent = raw;
        }
      }

      // 5. Volume
      let volume = '0';
      const volEl = row.querySelector('[data-testid="table-cell-volume"]');
      if (volEl) {
        volume = volEl.textContent.trim();
      }

      // 6. KD %
      let kd = '0';
      const kdEl = row.querySelector('[data-testid="table-cell-kd"]');
      if (kdEl) {
        kd = kdEl.textContent.trim().replace('%', '');
      }

      // 7. CPC
      let cpc = '0.00';
      const cpcEl = row.querySelector('[data-testid="table-cell-cpc"]');
      if (cpcEl) {
        cpc = cpcEl.textContent.trim().replace('$', '');
      }

      // 8. Competitive Density
      let compLvl = '0.00';
      const compEl = row.querySelector('[data-testid="table-cell-comp-lvl"]');
      if (compEl) {
        compLvl = compEl.textContent.trim();
      }

      // 9. Last Updated Freshness
      let updated = 'Recent';
      const upEl = row.querySelector('[data-testid="table-cell-updated"]') ||
                   row.querySelector('.sm-last-changes-cell__text');
      if (upEl) {
        const t = upEl.textContent.trim();
        if (t) updated = t;
      }

      items.push({
        keyword,
        intent: intent || 'Informational',
        volume: volume || '0',
        kd: kd || '0',
        cpc: cpc || '0.00',
        compLvl: compLvl || '0.00',
        updated: updated || 'Recent'
      });
    });

    cachedKeywords = items;
    currentQuery = getSearchQuery();
    return items;
  }

  /**
   * Color Helpers for Google Sheets Styling
   */
  function getKdColors(kdStr) {
    const kd = parseInt(kdStr, 10) || 0;
    if (kd < 30) return { bg: '#E6F4EA', text: '#137333' }; // Very Easy - Soft Green
    if (kd < 50) return { bg: '#FEF7E0', text: '#B06000' }; // Possible - Soft Yellow
    if (kd < 70) return { bg: '#FEEDDC', text: '#C05621' }; // Difficult - Soft Orange
    if (kd < 85) return { bg: '#FCE8E6', text: '#C5221F' }; // Hard - Soft Red
    return { bg: '#F8D7DA', text: '#721C24' };              // Very Hard - Deep Red
  }

  function getIntentColors(intentStr) {
    const i = (intentStr || '').toLowerCase();
    if (i.includes('comm')) return { bg: '#FEF7E0', text: '#B06000' }; // Commercial
    if (i.includes('trans')) return { bg: '#FCE8E6', text: '#C5221F' }; // Transactional
    if (i.includes('nav')) return { bg: '#F3E8FD', text: '#7627BB' };   // Navigational
    return { bg: '#E8F0FE', text: '#1967D2' };                         // Informational
  }

  /**
   * Format as Rich HTML Table for Google Sheets / Excel
   * Direct pasting renders colors, bold headers, background styling and cell borders!
   */
  function formatAsStyledHTML(data) {
    const rowsHtml = data.map((r, idx) => {
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9F7FC';
      const kdCol = getKdColors(r.kd);
      const intCol = getIntentColors(r.intent);

      return `
        <tr style="background-color: ${rowBg};">
          <td style="border: 1px solid #D2D6DC; padding: 8px 12px; font-weight: 600; color: #111827; text-align: left;">${r.keyword}</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 10px; text-align: center; background-color: ${intCol.bg}; color: ${intCol.text}; font-weight: bold;">${r.intent}</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 12px; text-align: right; font-weight: bold; color: #1F2937;">${r.volume}</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 10px; text-align: center; background-color: ${kdCol.bg}; color: ${kdCol.text}; font-weight: bold;">${r.kd}%</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 12px; text-align: right; color: #374151;">$${r.cpc}</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 10px; text-align: center; color: #4B5563;">${r.compLvl}</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 12px; text-align: right; color: #6B7280; font-size: 11px;">${r.updated}</td>
        </tr>
      `;
    }).join('');

    return `
      <table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px; color: #333333; border: 1px solid #D2D6DC;">
        <thead>
          <tr style="background-color: #2B0F52; color: #FFFFFF; font-weight: bold;">
            <th style="border: 1px solid #3E1B74; padding: 10px 14px; text-align: left; background-color: #2B0F52; color: #FFFFFF;">Keyword</th>
            <th style="border: 1px solid #3E1B74; padding: 10px 12px; text-align: center; background-color: #2B0F52; color: #FFFFFF;">Intent</th>
            <th style="border: 1px solid #3E1B74; padding: 10px 14px; text-align: right; background-color: #2B0F52; color: #FFFFFF;">Volume</th>
            <th style="border: 1px solid #3E1B74; padding: 10px 12px; text-align: center; background-color: #2B0F52; color: #FFFFFF;">KD %</th>
            <th style="border: 1px solid #3E1B74; padding: 10px 14px; text-align: right; background-color: #2B0F52; color: #FFFFFF;">CPC</th>
            <th style="border: 1px solid #3E1B74; padding: 10px 12px; text-align: center; background-color: #2B0F52; color: #FFFFFF;">Comp. Density</th>
            <th style="border: 1px solid #3E1B74; padding: 10px 14px; text-align: right; background-color: #2B0F52; color: #FFFFFF;">Freshness</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  /**
   * Format Plain TSV
   */
  function formatAsTSV(data) {
    const header = ['Keyword', 'Intent', 'Volume', 'KD %', 'CPC', 'Comp', 'Updated'].join('\t');
    const rows = data.map(r =>
      [r.keyword, r.intent, r.volume, r.kd, r.cpc, r.compLvl, r.updated].join('\t')
    );
    return [header, ...rows].join('\n');
  }

  function formatAsCSV(data) {
    const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
    const header = ['Keyword', 'Intent', 'Volume', 'KD %', 'CPC', 'Comp', 'Updated'].map(esc).join(',');
    const rows = data.map(r =>
      [r.keyword, r.intent, r.volume, r.kd, r.cpc, r.compLvl, r.updated].map(esc).join(',')
    );
    return [header, ...rows].join('\n');
  }

  function formatKeywordsOnly(data) {
    return data.map(r => r.keyword).join('\n');
  }

  /**
   * Dual Clipboard Writer (text/html + text/plain)
   * When pasting into Google Sheets or Excel, it automatically uses text/html with colors!
   */
  async function copyRichTable(data) {
    const htmlContent = formatAsStyledHTML(data);
    const plainText = formatAsTSV(data);

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]);
        return true;
      }
    } catch (e) {
      console.warn('ClipboardItem error, falling back:', e);
    }

    // Fallback via copy event listener
    return new Promise((resolve) => {
      const listener = (evt) => {
        evt.preventDefault();
        evt.clipboardData.setData('text/html', htmlContent);
        evt.clipboardData.setData('text/plain', plainText);
      };
      document.addEventListener('copy', listener, { once: true });
      document.execCommand('copy');
      resolve(true);
    });
  }

  function copyPlainText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        if (document.execCommand('copy')) resolve();
        else reject(new Error('Copy failed'));
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  /**
   * Show toast within the isolated Shadow DOM
   */
  function showToast(msg, isError = false) {
    if (!shadowRoot) return;
    const toast = shadowRoot.querySelector('#sqc-toast');
    if (!toast) return;

    toast.textContent = msg;
    toast.className = 'sqc-toast show' + (isError ? ' error' : '');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = 'sqc-toast';
    }, 2400);
  }

  /**
   * Render Shadow DOM Floating Widget
   */
  function renderWidget() {
    const isKeywordPage = window.location.pathname.includes('/keywordmagic') ||
                          window.location.pathname.includes('/keywordoverview') ||
                          window.location.search.includes('q=');

    if (!isKeywordPage) {
      if (widgetHost) widgetHost.style.display = 'none';
      return;
    }

    extractKeywords();

    if (!widgetHost) {
      widgetHost = document.createElement('div');
      widgetHost.id = 'sqc-floating-root';
      widgetHost.style.all = 'initial';
      widgetHost.style.position = 'fixed';
      widgetHost.style.bottom = '20px';
      widgetHost.style.right = '20px';
      widgetHost.style.zIndex = '2147483647';
      document.body.appendChild(widgetHost);
      shadowRoot = widgetHost.attachShadow({ mode: 'open' });
    }

    widgetHost.style.display = 'block';

    const count = cachedKeywords.length;
    const query = currentQuery || 'Keywords';

    shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          line-height: 1.25;
        }

        .widget-box {
          width: 260px;
          background: linear-gradient(145deg, #16082e 0%, #0c0219 100%);
          border: 1px solid rgba(199, 125, 255, 0.35);
          border-radius: 14px;
          padding: 12px 14px 10px 14px;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.65), 0 0 16px rgba(157, 78, 221, 0.25);
          color: #fcedff;
          position: relative;
          user-select: none;
        }

        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #c77dff;
          border-radius: 50%;
          box-shadow: 0 0 8px #c77dff;
          flex-shrink: 0;
        }

        .brand-title {
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.2px;
        }

        .count-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 7px;
          background: rgba(199, 125, 255, 0.18);
          color: #e0aaff;
          border: 1px solid rgba(224, 170, 255, 0.4);
          border-radius: 10px;
        }

        .query-box {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(28, 10, 56, 0.7);
          border: 1px solid rgba(199, 125, 255, 0.18);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          margin-bottom: 9px;
        }

        .query-lbl {
          color: #c77dff;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
        }

        .query-txt {
          color: #ffffff;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 175px;
        }

        .actions-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 9px;
        }

        .btn-main {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8.5px 10px;
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%);
          border: 1px solid rgba(252, 237, 255, 0.35);
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 3px 12px rgba(123, 44, 191, 0.35);
          transition: all 0.2s ease;
        }

        .btn-main:hover {
          background: linear-gradient(135deg, #9d4edd 0%, #c77dff 100%);
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(157, 78, 221, 0.5);
        }

        .btn-main:active {
          transform: translateY(0);
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
          <span class="query-txt" title="${query}">"${query}"</span>
        </div>

        <div class="actions-col">
          <button type="button" class="btn-main" id="btn-tsv" title="Copies styled colored table ready to paste into Google Sheets or Excel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy Styled (Colored Sheets)
          </button>

          <div class="btn-row">
            <button type="button" class="btn-sub" id="btn-csv" title="Copy standard CSV">CSV</button>
            <button type="button" class="btn-sub" id="btn-list" title="Copy plain keyword list">List Only</button>
          </div>
        </div>

        <div class="fixed-footer">
          Made With ❤️ By <a href="https://r1fat.pages.dev" target="_blank" rel="noopener noreferrer" class="r1fat-link">r1fat</a>
        </div>
      </div>
    `;

    // Event handlers inside Shadow DOM
    const btnTsv = shadowRoot.querySelector('#btn-tsv');
    const btnCsv = shadowRoot.querySelector('#btn-csv');
    const btnList = shadowRoot.querySelector('#btn-list');

    btnTsv?.addEventListener('click', () => {
      extractKeywords();
      if (!cachedKeywords.length) {
        showToast('No keywords detected yet', true);
        return;
      }
      copyRichTable(cachedKeywords).then(() => {
        showToast(`✨ Copied ${cachedKeywords.length} styled rows for Sheets!`);
      }).catch(() => showToast('Copy failed', true));
    });

    btnCsv?.addEventListener('click', () => {
      extractKeywords();
      if (!cachedKeywords.length) {
        showToast('No keywords detected yet', true);
        return;
      }
      copyPlainText(formatAsCSV(cachedKeywords)).then(() => {
        showToast(`📄 Copied ${cachedKeywords.length} as CSV!`);
      }).catch(() => showToast('Copy failed', true));
    });

    btnList?.addEventListener('click', () => {
      extractKeywords();
      if (!cachedKeywords.length) {
        showToast('No keywords detected yet', true);
        return;
      }
      copyPlainText(formatKeywordsOnly(cachedKeywords)).then(() => {
        showToast(`🔤 Copied ${cachedKeywords.length} plain keywords!`);
      }).catch(() => showToast('Copy failed', true));
    });
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_DATA') {
      const data = extractKeywords();
      sendResponse({
        success: true,
        query: getSearchQuery(),
        count: data.length,
        keywords: data
      });
    }
  });

  // Observe SPA DOM updates
  let updateTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      renderWidget();
    }, 400);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', () => {
    setTimeout(renderWidget, 500);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderWidget);
  } else {
    setTimeout(renderWidget, 600);
  }
})();
