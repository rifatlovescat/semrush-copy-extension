/**
 * Semrush Quick Copy - Popup Script (V2)
 * Author: r1fat (https://r1fat.pages.dev)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const queryNameEl = document.getElementById('query-name');
  const countBadgeEl = document.getElementById('keyword-count-badge');
  const keywordsListEl = document.getElementById('keywords-list');
  const popupToastEl = document.getElementById('popup-toast');

  const btnCopyTsv = document.getElementById('btn-copy-tsv');
  const btnCopyCsv = document.getElementById('btn-copy-csv');
  const btnCopyList = document.getElementById('btn-copy-list');
  const btnExportFile = document.getElementById('btn-export-file');
  const btnRefresh = document.getElementById('btn-refresh');

  let currentKeywords = [];
  let currentQuery = '';
  let toastTimer = null;

  // Show Toast
  function showToast(message) {
    if (!popupToastEl) return;
    popupToastEl.textContent = message;
    popupToastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      popupToastEl.classList.remove('show');
    }, 2200);
  }

  // Copy to clipboard helper
  function copyToClipboard(text, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(successMsg);
    });
  }

  // Render Keywords Preview
  function renderKeywords(keywords, query) {
    currentKeywords = keywords || [];
    currentQuery = query || '';

    queryNameEl.textContent = currentQuery ? `"${currentQuery}"` : 'Active Page';
    countBadgeEl.textContent = `${currentKeywords.length} Found`;

    if (!currentKeywords.length) {
      keywordsListEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width: 32px; height: 32px; color: var(--accent-lavender);">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No active keywords detected on this page.<br>Make sure you have searched for a keyword on Semrush.</p>
        </div>
      `;
      return;
    }

    keywordsListEl.innerHTML = currentKeywords.map((kw, i) => {
      const intentClass = `kw-intent-${(kw.intent || 'informational').toLowerCase()}`;
      return `
        <div class="kw-card">
          <div class="kw-card-top">
            <span class="kw-text" title="${kw.keyword}">${i + 1}. ${escapeHtml(kw.keyword)}</span>
            <span class="kw-intent-badge ${intentClass}">${escapeHtml(kw.intent)}</span>
          </div>
          <div class="kw-card-bottom">
            <div class="kw-stat"><span class="kw-stat-label">Vol:</span> <span class="kw-stat-val">${kw.volume}</span></div>
            <div class="kw-stat"><span class="kw-stat-label">KD:</span> <span class="kw-stat-val">${kw.kd}%</span></div>
            <div class="kw-stat"><span class="kw-stat-label">CPC:</span> <span class="kw-stat-val">$${kw.cpc}</span></div>
            <div class="kw-stat"><span class="kw-stat-label">Freshness:</span> <span class="kw-stat-val">${kw.updated}</span></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Format Helpers
  function getTSVData() {
    const header = ['Keyword', 'Intent', 'Volume', 'KD %', 'CPC', 'Comp', 'Updated'].join('\t');
    const rows = currentKeywords.map(r =>
      [r.keyword, r.intent, r.volume, r.kd, r.cpc, r.compLvl, r.updated].join('\t')
    );
    return [header, ...rows].join('\n');
  }

  function getCSVData() {
    const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
    const header = ['Keyword', 'Intent', 'Volume', 'KD %', 'CPC', 'Comp', 'Updated'].map(esc).join(',');
    const rows = currentKeywords.map(r =>
      [r.keyword, r.intent, r.volume, r.kd, r.cpc, r.compLvl, r.updated].map(esc).join(',')
    );
    return [header, ...rows].join('\n');
  }

  function getKeywordsOnly() {
    return currentKeywords.map(r => r.keyword).join('\n');
  }

  // Request Data from Active Tab
  function fetchActiveTabData() {
    keywordsListEl.innerHTML = `
      <div class="empty-state">
        <div class="pulse-loader"></div>
        <p>Scanning active Semrush tab for keywords...</p>
      </div>
    `;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (!activeTab || !activeTab.id) {
        renderKeywords([], '');
        return;
      }

      // Check if not on semrush.com
      if (!activeTab.url || !activeTab.url.includes('semrush.com')) {
        keywordsListEl.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width: 32px; height: 32px; color: var(--accent-lavender);">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>Please open a Semrush Keyword Magic Tool page to extract results.</p>
          </div>
        `;
        queryNameEl.textContent = 'Not on Semrush';
        countBadgeEl.textContent = '0 Found';
        return;
      }

      // Try sending message to content script first
      chrome.tabs.sendMessage(activeTab.id, { action: 'GET_DATA' }, (response) => {
        if (!chrome.runtime.lastError && response && response.keywords && response.keywords.length > 0) {
          renderKeywords(response.keywords, response.query);
        } else {
          // Fallback direct execution script with identical robust logic
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => {
              const rows = document.querySelectorAll('div[data-testid="table-row"], div.sm-table-layout__row, div[role="row"]');
              const items = [];

              rows.forEach((row) => {
                const kwAnchor = row.querySelector('[data-testid="table-cell-keyword"] a') ||
                                 row.querySelector('.sm-cell-phrase__link') ||
                                 row.querySelector('a[href*="/keywordoverview/"]') ||
                                 row.querySelector('[data-ui-name="Checkbox.Text"]');
                if (!kwAnchor) return;

                const keyword = kwAnchor.textContent.trim();
                if (!keyword || keyword.toLowerCase() === 'keyword') return;

                const checkbox = row.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.disabled) return;
                if (row.classList.contains('sm-table-row-layout__locked')) return;

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

                let volume = '0';
                const volEl = row.querySelector('[data-testid="table-cell-volume"]');
                if (volEl) volume = volEl.textContent.trim();

                let kd = '0';
                const kdEl = row.querySelector('[data-testid="table-cell-kd"]');
                if (kdEl) kd = kdEl.textContent.trim().replace('%', '');

                let cpc = '0.00';
                const cpcEl = row.querySelector('[data-testid="table-cell-cpc"]');
                if (cpcEl) cpc = cpcEl.textContent.trim().replace('$', '');

                let compLvl = '0.00';
                const compEl = row.querySelector('[data-testid="table-cell-comp-lvl"]');
                if (compEl) compLvl = compEl.textContent.trim();

                let updated = 'Recent';
                const upEl = row.querySelector('[data-testid="table-cell-updated"]') ||
                             row.querySelector('.sm-last-changes-cell__text');
                if (upEl) {
                  const t = upEl.textContent.trim();
                  if (t) updated = t;
                }

                items.push({ keyword, intent, volume, kd, cpc, compLvl, updated });
              });

              const qParam = new URLSearchParams(window.location.search).get('q');
              const searchInput = document.querySelector('input[data-test="searchbar_input"]');
              const q = qParam || (searchInput ? searchInput.value : '');

              return { success: true, query: q, keywords: items };
            }
          }).then((res) => {
            if (res && res[0] && res[0].result) {
              const r = res[0].result;
              renderKeywords(r.keywords, r.query);
            } else {
              renderKeywords([], '');
            }
          }).catch(() => {
            renderKeywords([], '');
          });
        }
      });
    });
  }

  // Button Handlers
  btnCopyTsv.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to copy!');
    copyToClipboard(getTSVData(), `✨ Copied ${currentKeywords.length} keywords for Sheets!`);
  });

  btnCopyCsv.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to copy!');
    copyToClipboard(getCSVData(), `📄 Copied ${currentKeywords.length} as CSV!`);
  });

  btnCopyList.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to copy!');
    copyToClipboard(getKeywordsOnly(), `🔤 Copied ${currentKeywords.length} plain keywords!`);
  });

  btnExportFile.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to export!');
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(getCSVData());
    const querySlug = (currentQuery || 'semrush_keywords').replace(/[^a-zA-Z0-9_-]/g, '_');
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${querySlug}_keywords.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`💾 Downloaded ${currentKeywords.length} keywords!`);
  });

  btnRefresh.addEventListener('click', () => {
    fetchActiveTabData();
  });

  // Link handling in Chrome popup
  document.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        chrome.tabs.create({ url: href });
      }
    });
  });

  // Initial Fetch
  fetchActiveTabData();
});
