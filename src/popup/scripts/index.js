/**
 * Semrush Quick Copy - Popup Controller Module
 * Author: r1fat (https://r1fat.pages.dev)
 */

document.addEventListener('DOMContentLoaded', () => {
  const { showToast, renderKeywords } = window.SQC.PopupUI;
  const { loadStoredKgr } = window.SQC.Storage;
  const { copyRichTable, copyPlainText, formatKeywordsOnly, downloadCsvFile } = window.SQC.Formatters;

  const btnCopyTsv = document.getElementById('btn-copy-tsv');
  const btnAutoKgr = document.getElementById('btn-auto-kgr');
  const btnCopyCsv = document.getElementById('btn-copy-csv');
  const btnCopyList = document.getElementById('btn-copy-list');
  const btnExportFile = document.getElementById('btn-export-file');
  const btnRefresh = document.getElementById('btn-refresh');
  const keywordsListEl = document.getElementById('keywords-list');
  const queryNameEl = document.getElementById('query-name');
  const countBadgeEl = document.getElementById('keyword-count-badge');

  let currentKeywords = [];
  let cachedAllintitle = {};
  let currentQuery = '';

  function fetchActiveTabData() {
    loadStoredKgr((stored) => {
      cachedAllintitle = stored || {};
      if (keywordsListEl) {
        keywordsListEl.innerHTML = `
          <div class="empty-state">
            <div class="pulse-loader"></div>
            <p>Scanning active Semrush tab for keywords...</p>
          </div>
        `;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs && tabs[0];
        if (!activeTab || !activeTab.id) {
          currentKeywords = renderKeywords([], '', cachedAllintitle);
          return;
        }

        if (!activeTab.url || !activeTab.url.includes('semrush.com')) {
          if (keywordsListEl) {
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
          }
          if (queryNameEl) queryNameEl.textContent = 'Not on Semrush';
          if (countBadgeEl) countBadgeEl.textContent = '0 Found';
          currentKeywords = [];
          return;
        }

        chrome.tabs.sendMessage(activeTab.id, { action: 'GET_DATA' }, (response) => {
          if (!chrome.runtime.lastError && response && response.keywords && response.keywords.length > 0) {
            currentQuery = response.query || '';
            currentKeywords = renderKeywords(response.keywords, currentQuery, cachedAllintitle);
          } else {
            // Direct extraction fallback using Scraper module if tab message did not respond
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: () => {
                if (window.SQC && window.SQC.Scraper) {
                  return {
                    success: true,
                    query: window.SQC.Scraper.getSearchQuery(),
                    keywords: window.SQC.Scraper.extractKeywords({})
                  };
                }
                return { success: false, query: '', keywords: [] };
              }
            }).then((res) => {
              if (res && res[0] && res[0].result && res[0].result.keywords.length > 0) {
                const r = res[0].result;
                currentQuery = r.query;
                currentKeywords = renderKeywords(r.keywords, currentQuery, cachedAllintitle);
              } else {
                currentKeywords = renderKeywords([], '', cachedAllintitle);
              }
            }).catch(() => {
              currentKeywords = renderKeywords([], '', cachedAllintitle);
            });
          }
        });
      });
    });
  }

  // Button Listeners
  btnCopyTsv?.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to copy!', true);
    copyRichTable(currentKeywords)
      .then(() => showToast(`✨ Copied ${currentKeywords.length} KGR rows for Sheets!`))
      .catch(() => showToast('Copy failed', true));
  });

  btnAutoKgr?.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to check!', true);
    if (window.SQC.KgrRunner.isRunnerBusy()) return;

    btnAutoKgr.innerHTML = '<span>⏳</span><span>Checking KGR...</span>';
    showToast(`⚡ Checking KGR for ${currentKeywords.length} keywords...`);

    window.SQC.KgrRunner.runAutoCheckKgr(
      currentKeywords,
      cachedAllintitle,
      (current, total, kw) => {
        showToast(`🔍 (${current}/${total}): ${kw}`);
      },
      (updatedCache) => {
        cachedAllintitle = updatedCache;
        btnAutoKgr.innerHTML = '<span>⚡</span><span>Auto-Check KGR (Google)</span>';
        currentKeywords = renderKeywords(currentKeywords, currentQuery, cachedAllintitle);
        showToast(`✨ KGR check complete!`);
      }
    );
  });

  btnCopyCsv?.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to download!', true);
    downloadCsvFile(currentKeywords, currentQuery);
    showToast(`💾 Downloaded ${currentKeywords.length} as CSV!`);
  });

  btnExportFile?.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to download!', true);
    downloadCsvFile(currentKeywords, currentQuery);
    showToast(`💾 Downloaded ${currentKeywords.length} as CSV!`);
  });

  btnCopyList?.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to copy!', true);
    copyPlainText(formatKeywordsOnly(currentKeywords))
      .then(() => showToast(`🔤 Copied ${currentKeywords.length} plain keywords!`))
      .catch(() => showToast('Copy failed', true));
  });

  btnRefresh?.addEventListener('click', () => {
    fetchActiveTabData();
    showToast('🔄 Refreshed keywords');
  });

  // External link handler
  document.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) chrome.tabs.create({ url: href });
    });
  });

  // Initial Fetch
  fetchActiveTabData();
});
