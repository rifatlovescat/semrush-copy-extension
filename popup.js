/**
 * Semrush Quick Copy - Popup Script (V4 - KGR Integration)
 * Author: r1fat (https://r1fat.pages.dev)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const queryNameEl = document.getElementById('query-name');
  const countBadgeEl = document.getElementById('keyword-count-badge');
  const keywordsListEl = document.getElementById('keywords-list');
  const popupToastEl = document.getElementById('popup-toast');

  const btnCopyTsv = document.getElementById('btn-copy-tsv');
  const btnAutoKgr = document.getElementById('btn-auto-kgr');
  const btnCopyCsv = document.getElementById('btn-copy-csv');
  const btnCopyList = document.getElementById('btn-copy-list');
  const btnExportFile = document.getElementById('btn-export-file');
  const btnRefresh = document.getElementById('btn-refresh');

  let currentKeywords = [];
  let cachedAllintitle = {};
  let currentQuery = '';
  let toastTimer = null;
  let isCheckingKgr = false;

  // Show Toast
  function showToast(message) {
    if (!popupToastEl) return;
    popupToastEl.textContent = message;
    popupToastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      popupToastEl.classList.remove('show');
    }, 2400);
  }

  // Load KGR Cache from chrome.storage
  function loadStoredKgr(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(null, (items) => {
        const result = {};
        for (const [key, val] of Object.entries(items || {})) {
          if (key.startsWith('kgr_')) {
            const kw = key.slice(4).toLowerCase();
            if (kw.includes('select all')) {
              chrome.storage.local.remove(key);
            } else {
              result[kw] = val;
            }
          }
        }
        cachedAllintitle = result;
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
  }

  // Render Keywords Preview
  function renderKeywords(keywords, query) {
    currentKeywords = (keywords || []).map(r => {
      const normKw = (r.keyword || '').toLowerCase();
      const allintitleCount = cachedAllintitle[normKw] !== undefined ? cachedAllintitle[normKw] : (r.allintitle !== undefined ? r.allintitle : null);
      const volumeNum = r.volumeNum || parseInt(String(r.volume || '0').replace(/,/g, ''), 10) || 0;
      let kgr = null;
      if (allintitleCount !== null && volumeNum > 0) {
        kgr = +(allintitleCount / volumeNum).toFixed(4);
      }
      return { ...r, allintitle: allintitleCount, volumeNum, kgr };
    });

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
      
      let kgrBadge = '';
      if (kw.kgr !== null && kw.kgr !== undefined) {
        const kgrClass = kw.kgr < 0.25 ? 'kw-kgr-golden' : (kw.kgr <= 1.0 ? 'kw-kgr-moderate' : 'kw-kgr-hard');
        const kgrLabel = kw.kgr < 0.25 ? '? Golden' : (kw.kgr <= 1.0 ? '? Moderate' : '? Hard');
        kgrBadge = `<span class="kw-kgr-pill ${kgrClass}">${kw.kgr} (${kgrLabel})</span>`;
      }

      return `
        <div class="kw-card">
          <div class="kw-card-top">
            <span class="kw-text" title="${kw.keyword}">${i + 1}. ${escapeHtml(kw.keyword)}</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              ${kgrBadge}
              <span class="kw-intent-badge ${intentClass}">${escapeHtml(kw.intent)}</span>
            </div>
          </div>
          <div class="kw-card-bottom">
            <div class="kw-stat"><span class="kw-stat-label">MSV:</span> <span class="kw-stat-val">${kw.volumeNum.toLocaleString()}</span></div>
            <div class="kw-stat"><span class="kw-stat-label">KD:</span> <span class="kw-stat-val">${kw.kd}%</span></div>
            <div class="kw-stat"><span class="kw-stat-label">Allintitle:</span> <span class="kw-stat-val">${kw.allintitle !== null ? kw.allintitle.toLocaleString() : '-'}</span></div>
            <div class="kw-stat"><span class="kw-stat-label">CPC:</span> <span class="kw-stat-val">$${kw.cpc}</span></div>
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

  function getKdColors(kdStr) {
    const kd = parseInt(kdStr, 10) || 0;
    if (kd < 30) return { bg: '#E6F4EA', text: '#137333' }; // Very Easy
    if (kd < 50) return { bg: '#FEF7E0', text: '#B06000' }; // Possible
    if (kd < 70) return { bg: '#FEEDDC', text: '#C05621' }; // Difficult
    if (kd < 85) return { bg: '#FCE8E6', text: '#C5221F' }; // Hard
    return { bg: '#F8D7DA', text: '#721C24' };              // Very Hard
  }

  function getIntentColors(intentStr) {
    const i = (intentStr || '').toLowerCase();
    if (i.includes('comm')) return { bg: '#FEF7E0', text: '#B06000' };
    if (i.includes('trans')) return { bg: '#FCE8E6', text: '#C5221F' };
    if (i.includes('nav')) return { bg: '#F3E8FD', text: '#7627BB' };
    return { bg: '#E8F0FE', text: '#1967D2' };
  }

  function getKgrColors(kgrVal) {
    if (kgrVal === null || kgrVal === undefined) return { bg: '#F3F4F6', text: '#6B7280' };
    if (kgrVal < 0.25) return { bg: '#E6F4EA', text: '#137333' };
    if (kgrVal <= 1.00) return { bg: '#FEF7E0', text: '#B06000' };
    return { bg: '#FCE8E6', text: '#C5221F' };
  }

  /**
   * Format as Rich HTML Table for Google Sheets / Excel
   * Columns: Keyword | Intent | MSV | KD | ALLINTITLE | KGR | CPC | Comp | Updated
   */
  function formatAsStyledHTML(data) {
    const rowsHtml = data.map((r, idx) => {
      const rowNum = idx + 2;
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9F7FC';
      const kdCol = getKdColors(r.kd);
      const intCol = getIntentColors(r.intent);
      const kgrCol = getKgrColors(r.kgr);

      const googleSearchUrl = `https://www.google.com/search?q=allintitle:%22${encodeURIComponent(r.keyword)}%22`;
      const allintitleDisplay = (r.allintitle !== null && r.allintitle !== undefined)
        ? r.allintitle
        : `<a href="${googleSearchUrl}" target="_blank" style="color: #7b2cbf; text-decoration: underline; font-weight: 600;">?? Check allintitle</a>`;

      // Live auto-calculation formula for Google Sheets / Excel: KGR = Allintitle / MSV
      const kgrCellFormula = `=IF(AND(E${rowNum}<>"", C${rowNum}>0), ROUND(IF(ISNUMBER(E${rowNum}), E${rowNum}, VALUE(SUBSTITUTE(E${rowNum}, ",", ""))) / C${rowNum}, 4), "")`;
      const kgrDisplay = kgrCellFormula;

      return `
        <tr style="background-color: ${rowBg};">
          <td style="border: 1px solid #D2D6DC; padding: 8px 12px; font-weight: 600; color: #111827; text-align: left;">${r.keyword}</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 10px; text-align: center; background-color: ${intCol.bg}; color: ${intCol.text}; font-weight: bold;">${r.intent}</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 12px; text-align: right; font-weight: bold; color: #1F2937;">${r.volumeNum}</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 10px; text-align: center; background-color: ${kdCol.bg}; color: ${kdCol.text}; font-weight: bold;">${r.kd}%</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 12px; text-align: center; font-weight: 600; color: #374151;">${allintitleDisplay}</td>
          <td style="border: 1px solid #D2D6DC; padding: 8px 12px; text-align: center; background-color: ${kgrCol.bg}; color: ${kgrCol.text}; font-weight: bold;">${kgrDisplay}</td>
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
            <th style="border: 1px solid #3E1B74; padding: 10px 14px; text-align: right; background-color: #2B0F52; color: #FFFFFF;">MSV</th>
            <th style="border: 1px solid #3E1B74; padding: 10px 12px; text-align: center; background-color: #2B0F52; color: #FFFFFF;">KD %</th>
            <th style="border: 1px solid #3E1B74; padding: 10px 14px; text-align: center; background-color: #2B0F52; color: #FFFFFF;">ALLINTITLE</th>
            <th style="border: 1px solid #3E1B74; padding: 10px 14px; text-align: center; background-color: #2B0F52; color: #FFFFFF;">KGR</th>
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

  function getTSVData() {
    const header = ['Keyword', 'Intent', 'MSV', 'KD %', 'ALLINTITLE', 'KGR', 'CPC', 'Comp', 'Updated'].join('\t');
    const rows = currentKeywords.map((r, idx) => {
      const rowNum = idx + 2;
      const allintitleVal = r.allintitle !== null ? r.allintitle : `=HYPERLINK("https://www.google.com/search?q=allintitle:%22"&A${rowNum}&"%22", "Check allintitle")`;
      const kgrVal = `=IF(AND(E${rowNum}<>"", C${rowNum}>0), ROUND(IF(ISNUMBER(E${rowNum}), E${rowNum}, VALUE(SUBSTITUTE(E${rowNum}, ",", ""))) / C${rowNum}, 4), "")`;
      return [r.keyword, r.intent, r.volumeNum, r.kd, allintitleVal, kgrVal, r.cpc, r.compLvl, r.updated].join('\t');
    });
    return [header, ...rows].join('\n');
  }

  function getCSVData() {
    const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
    const header = ['Keyword', 'Intent', 'MSV', 'KD %', 'ALLINTITLE', 'KGR', 'CPC', 'Comp', 'Updated'].map(esc).join(',');
    const rows = currentKeywords.map((r, idx) => {
      const rowNum = idx + 2;
      const allintitleVal = r.allintitle !== null ? r.allintitle : `https://www.google.com/search?q=allintitle:%22${encodeURIComponent(r.keyword)}%22`;
      const kgrVal = `=IF(AND(E${rowNum}<>"", C${rowNum}>0), ROUND(IF(ISNUMBER(E${rowNum}), E${rowNum}, VALUE(SUBSTITUTE(E${rowNum}, ",", ""))) / C${rowNum}, 4), "")`;
      return [r.keyword, r.intent, r.volumeNum, r.kd, allintitleVal, kgrVal, r.cpc, r.compLvl, r.updated].map(esc).join(',');
    });
    return [header, ...rows].join('\n');
  }

  function getKeywordsOnly() {
    return currentKeywords.map(r => r.keyword).join('\n');
  }

  // Dual Clipboard Writer (text/html + text/plain)
  async function copyRichTable(data) {
    const htmlContent = formatAsStyledHTML(data);
    const plainText = getTSVData();

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
        showToast(`? Copied ${data.length} KGR rows for Sheets!`);
        return;
      }
    } catch (e) {
      console.warn('ClipboardItem error, falling back:', e);
    }

    const listener = (evt) => {
      evt.preventDefault();
      evt.clipboardData.setData('text/html', htmlContent);
      evt.clipboardData.setData('text/plain', plainText);
    };
    document.addEventListener('copy', listener, { once: true });
    document.execCommand('copy');
    showToast(`? Copied ${data.length} KGR rows for Sheets!`);
  }

  function copyPlainText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(msg));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(msg);
    }
  }

  // Auto-Check KGR from Popup
  async function runAutoCheckKgr() {
    if (isCheckingKgr) return;
    isCheckingKgr = true;

    btnAutoKgr.innerHTML = '<span>?</span><span>Checking KGR...</span>';
    showToast(`? Checking KGR for ${currentKeywords.length} keywords...`);

    for (let i = 0; i < currentKeywords.length; i++) {
      const kw = currentKeywords[i].keyword;
      const normKw = kw.toLowerCase();

      if (cachedAllintitle[normKw] !== undefined) continue;

      try {
        const searchUrl = `https://www.google.com/search?q=allintitle:%22${encodeURIComponent(kw)}%22`;
        const res = await fetch(searchUrl, { mode: 'cors' });
        if (res.ok) {
          const html = await res.text();
          let count = 0;
          const match = html.match(/(?:About\s+)?([0-9,]+)\s+results/i);
          if (match && match[1]) {
            count = parseInt(match[1].replace(/,/g, ''), 10) || 0;
          } else if (html.includes('did not match any documents') || html.includes('No results found')) {
            count = 0;
          }

          cachedAllintitle[normKw] = count;
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ['kgr_' + normKw]: count });
          }
        }
      } catch (e) {
        console.warn('Auto-check error:', kw, e);
      }

      await new Promise(r => setTimeout(r, 1200));
    }

    isCheckingKgr = false;
    btnAutoKgr.innerHTML = '<span>?</span><span>Auto-Check KGR (Google)</span>';
    renderKeywords(currentKeywords, currentQuery);
    showToast(`? KGR check complete!`);
  }

  // Request Data from Active Tab
  function fetchActiveTabData() {
    loadStoredKgr(() => {
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

        if (!activeTab.url || !activeTab.url.includes('semrush.com')) {
          keywordsListEl.innerHTML = `
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width: 32px; height: 32px; color: var(--accent-lavender);">
                <circle cx="12" cy="12" r="10"></line>
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

        chrome.tabs.sendMessage(activeTab.id, { action: 'GET_DATA' }, (response) => {
          if (!chrome.runtime.lastError && response && response.keywords && response.keywords.length > 0) {
            renderKeywords(response.keywords, response.query);
          } else {
            // Direct extraction fallback
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: () => {
                const rows = document.querySelectorAll('div[data-testid="table-row"], div.sm-table-layout__row, div[role="row"]');
                const items = [];

                rows.forEach((row) => {
                  // 0. Skip table headers, column headers, and control rows
                  if (
                    row.matches('[data-testid="table-header-row"], .sm-table-layout__header, .sm-table-row-layout__head, thead tr') ||
                    row.querySelector('[role="columnheader"], [data-testid="table-cell-head"], th')
                  ) {
                    return;
                  }

                  // 1. Identify keyword anchor / text (genuine keyword rows have link or cell-keyword)
                  const kwAnchor = row.querySelector('[data-testid="table-cell-keyword"] a') ||
                                   row.querySelector('[data-testid="table-cell-keyword"]') ||
                                   row.querySelector('.sm-cell-phrase__link') ||
                                   row.querySelector('a[href*="/keywordoverview/"]');
                  if (!kwAnchor) return;

                  const keyword = kwAnchor.textContent.trim();
                  if (!keyword) return;

                  const lowerKw = keyword.toLowerCase();
                  if (lowerKw === 'keyword' || lowerKw === 'phrase' || lowerKw.includes('select all')) {
                    return;
                  }

                  const checkbox = row.querySelector('input[type="checkbox"]');
                  if (checkbox && checkbox.disabled) return;
                  if (row.classList.contains('sm-table-row-layout__locked')) return;

                  let intent = 'Informational';
                  const intentEl = row.querySelector('[data-testid="table-cell-intent"]');
                  if (intentEl) {
                    const btn = intentEl.querySelector('[aria-label]');
                    if (btn) intent = btn.getAttribute('aria-label').replace(/\.\s*Apply filter/i, '').trim();
                    else {
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
                  const volumeNum = parseInt(volume.replace(/,/g, ''), 10) || 0;

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

                  items.push({ keyword, intent, volume, volumeNum, kd, cpc, compLvl, updated });
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
    });
  }

  // Button Handlers
  btnCopyTsv.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to copy!');
    copyRichTable(currentKeywords);
  });

  btnAutoKgr.addEventListener('click', () => {
    runAutoCheckKgr();
  });

  btnCopyCsv.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to copy!');
    copyPlainText(getCSVData(), `?? Copied ${currentKeywords.length} as CSV!`);
  });

  btnCopyList.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to copy!');
    copyPlainText(getKeywordsOnly(), `?? Copied ${currentKeywords.length} plain keywords!`);
  });

  btnExportFile.addEventListener('click', () => {
    if (!currentKeywords.length) return showToast('No keywords to export!');
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(getCSVData());
    const querySlug = (currentQuery || 'semrush_keywords').replace(/[^a-zA-Z0-9_-]/g, '_');
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${querySlug}_kgr_keywords.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`?? Downloaded ${currentKeywords.length} keywords!`);
  });

  btnRefresh.addEventListener('click', () => {
    fetchActiveTabData();
  });

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
