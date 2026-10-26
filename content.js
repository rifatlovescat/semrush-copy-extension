/**
 * Semrush Quick Copy - Content Script
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__SEMRUSH_QUICK_COPY_INJECTED__) return;
  window.__SEMRUSH_QUICK_COPY_INJECTED__ = true;

  // State
  let cachedKeywords = [];
  let currentQuery = '';
  let widgetContainer = null;
  let toastTimeout = null;

  /**
   * Extract current search query from URL or search bar
   */
  function getSearchQuery() {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    if (qParam) return qParam.trim();

    // Fallback to search input in DOM
    const searchInput = document.querySelector('input[data-test="searchbar_input"]') ||
                        document.querySelector('input[name="q"]') ||
                        document.querySelector('input[type="search"]');
    return searchInput ? searchInput.value.trim() : '';
  }

  /**
   * Scrape active keyword rows from the Semrush DOM
   */
  function extractKeywords() {
    const rows = document.querySelectorAll('div[data-testid="table-row"], div.sm-table-layout__row');
    const items = [];

    rows.forEach((row) => {
      // Filter out locked / upgrade skeleton rows
      const isDisabled = row.querySelector('[disabled]') ||
                         row.classList.contains('__disabled_1t5yy-kmt_') ||
                         row.querySelector('.sm-table-row-layout__locked');
      
      const hasKeywordCell = row.querySelector('[data-testid="table-cell-keyword"]') ||
                             row.querySelector('.sm-cell-phrase') ||
                             row.querySelector('[data-ui-name="Checkbox.Text"]');

      if (isDisabled || !hasKeywordCell) return;

      // 1. Keyword Text
      const kwAnchor = row.querySelector('[data-testid="table-cell-keyword"] a') ||
                       row.querySelector('.sm-cell-phrase__link') ||
                       row.querySelector('[data-ui-name="Checkbox.Text"]');
      const keyword = kwAnchor ? kwAnchor.textContent.trim() : '';
      if (!keyword) return;

      // 2. Search Intent
      const intentEl = row.querySelector('[data-testid="table-cell-intent"] [aria-label]') ||
                       row.querySelector('[data-testid="table-cell-intent"]');
      let intent = '';
      if (intentEl) {
        const aria = intentEl.getAttribute('aria-label');
        intent = aria ? aria.replace(/\.\s*Apply filter/i, '').trim() : intentEl.textContent.trim();
      }

      // 3. Search Volume
      const volEl = row.querySelector('[data-testid="table-cell-volume"]');
      const volume = volEl ? volEl.textContent.trim() : '';

      // 4. Keyword Difficulty (KD %)
      const kdEl = row.querySelector('[data-testid="table-cell-kd"]');
      const kd = kdEl ? kdEl.textContent.trim() : '';

      // 5. Cost Per Click (CPC)
      const cpcEl = row.querySelector('[data-testid="table-cell-cpc"]');
      const cpc = cpcEl ? cpcEl.textContent.trim() : '';

      // 6. Competitive Density (Comp. Level)
      const compEl = row.querySelector('[data-testid="table-cell-comp-lvl"]');
      const compLvl = compEl ? compEl.textContent.trim() : '';

      // 7. Last Updated Freshness
      const upEl = row.querySelector('[data-testid="table-cell-updated"]') ||
                   row.querySelector('.sm-last-changes-cell__text');
      const updated = upEl ? upEl.textContent.trim() : '';

      items.push({
        keyword,
        intent: intent || 'N/A',
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
   * Format rows to TSV for Excel / Google Sheets
   */
  function formatAsTSV(data) {
    const header = ['Keyword', 'Intent', 'Volume', 'KD %', 'CPC', 'Comp', 'Updated'].join('\t');
    const rows = data.map(r =>
      [r.keyword, r.intent, r.volume, r.kd, r.cpc, r.compLvl, r.updated].join('\t')
    );
    return [header, ...rows].join('\n');
  }

  /**
   * Format rows to CSV
   */
  function formatAsCSV(data) {
    const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    const header = ['Keyword', 'Intent', 'Volume', 'KD %', 'CPC', 'Comp', 'Updated']
      .map(escapeCsv).join(',');
    const rows = data.map(r =>
      [r.keyword, r.intent, r.volume, r.kd, r.cpc, r.compLvl, r.updated].map(escapeCsv).join(',')
    );
    return [header, ...rows].join('\n');
  }

  /**
   * Format keywords only (newline separated)
   */
  function formatKeywordsOnly(data) {
    return data.map(r => r.keyword).join('\n');
  }

  /**
   * Copy string to clipboard with fallback
   */
  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) resolve();
        else reject(new Error('Copy command failed'));
      } catch (err) {
        document.body.removeChild(textarea);
        reject(err);
      }
    });
  }

  /**
   * Show toast notification
   */
  function showToast(message, isError = false) {
    let toast = document.getElementById('sqc-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sqc-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = 'sqc-toast show' + (isError ? ' error' : '');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.className = 'sqc-toast';
    }, 2800);
  }

  /**
   * In-page Floating Widget
   */
  function createOrUpdateFloatingWidget() {
    // Only display on Semrush keyword pages
    const isKeywordPage = window.location.pathname.includes('/keywordmagic') ||
                          window.location.pathname.includes('/keywordoverview') ||
                          window.location.search.includes('q=');

    if (!isKeywordPage) {
      if (widgetContainer) widgetContainer.style.display = 'none';
      return;
    }

    extractKeywords();

    if (!widgetContainer) {
      widgetContainer = document.createElement('div');
      widgetContainer.id = 'sqc-floating-widget';
      document.body.appendChild(widgetContainer);
    }

    widgetContainer.style.display = 'block';

    const count = cachedKeywords.length;
    const query = currentQuery || 'Keywords';

    widgetContainer.innerHTML = `
      <div class="sqc-widget-card">
        <div class="sqc-widget-header">
          <div class="sqc-brand">
            <span class="sqc-dot"></span>
            <span class="sqc-title">Semrush Quick Copy</span>
          </div>
          <span class="sqc-badge">${count} Found</span>
        </div>

        <div class="sqc-query-display">
          <span class="sqc-query-label">Target:</span>
          <span class="sqc-query-val" title="${query}">"${query}"</span>
        </div>

        <div class="sqc-actions">
          <button type="button" class="sqc-btn sqc-btn-primary" id="sqc-copy-tsv">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sqc-icon">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy for Sheets / Excel
          </button>

          <div class="sqc-btn-group">
            <button type="button" class="sqc-btn sqc-btn-secondary" id="sqc-copy-csv" title="Copy comma-separated values">
              CSV
            </button>
            <button type="button" class="sqc-btn sqc-btn-secondary" id="sqc-copy-list" title="Copy keyword list only">
              List Only
            </button>
          </div>
        </div>

        <footer class="sqc-fixed-footer">
          Made With ❤️ By <a href="https://r1fat.pages.dev" target="_blank" rel="noopener noreferrer" class="sqc-glow-link">r1fat</a>
        </footer>
      </div>
    `;

    // Event listeners
    const btnTsv = widgetContainer.querySelector('#sqc-copy-tsv');
    const btnCsv = widgetContainer.querySelector('#sqc-copy-csv');
    const btnList = widgetContainer.querySelector('#sqc-copy-list');

    btnTsv?.addEventListener('click', () => {
      extractKeywords();
      if (!cachedKeywords.length) {
        showToast('No keyword rows detected yet. Try refreshing!', true);
        return;
      }
      copyTextToClipboard(formatAsTSV(cachedKeywords)).then(() => {
        showToast(`✨ Copied ${cachedKeywords.length} keywords for Sheets/Excel!`);
      }).catch(() => showToast('Failed to copy to clipboard', true));
    });

    btnCsv?.addEventListener('click', () => {
      extractKeywords();
      if (!cachedKeywords.length) {
        showToast('No keyword rows detected yet', true);
        return;
      }
      copyTextToClipboard(formatAsCSV(cachedKeywords)).then(() => {
        showToast(`📄 Copied ${cachedKeywords.length} keywords as CSV!`);
      }).catch(() => showToast('Failed to copy to clipboard', true));
    });

    btnList?.addEventListener('click', () => {
      extractKeywords();
      if (!cachedKeywords.length) {
        showToast('No keyword rows detected yet', true);
        return;
      }
      copyTextToClipboard(formatKeywordsOnly(cachedKeywords)).then(() => {
        showToast(`🔤 Copied ${cachedKeywords.length} plain keywords!`);
      }).catch(() => showToast('Failed to copy to clipboard', true));
    });
  }

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_DATA') {
      const data = extractKeywords();
      sendResponse({
        success: true,
        query: getSearchQuery(),
        count: data.length,
        keywords: data
      });
    } else if (request.action === 'COPY_TSV') {
      const data = extractKeywords();
      copyTextToClipboard(formatAsTSV(data)).then(() => {
        showToast(`✨ Copied ${data.length} keywords!`);
        sendResponse({ success: true, count: data.length });
      });
      return true; // asynchronous response
    }
  });

  // Watch for dynamic DOM changes (since Semrush is a Single Page Application)
  let observerTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      createOrUpdateFloatingWidget();
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also listen for URL history changes
  window.addEventListener('popstate', () => {
    setTimeout(createOrUpdateFloatingWidget, 600);
  });

  // Initial setup when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createOrUpdateFloatingWidget);
  } else {
    setTimeout(createOrUpdateFloatingWidget, 800);
  }
})();
