/**
 * Semrush Quick Copy - Content Script (V4 - KGR Auto-Calculation & Google Grabber)
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  // State
  let cachedKeywords = [];
  let cachedAllintitle = {};
  let currentQuery = '';
  let widgetHost = null;
  let shadowRoot = null;
  let toastTimer = null;
  let isCheckingKgr = false;

  /**
   * Load stored allintitle results from chrome.storage.local
   */
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
        if (callback) callback(cachedAllintitle);
      });
    } else {
      if (callback) callback({});
    }
  }

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
      
      if (!kwAnchor) return; // Skip skeleton/paywalled or header rows

      const keyword = kwAnchor.textContent.trim();
      if (!keyword) return;

      const lowerKw = keyword.toLowerCase();
      if (lowerKw === 'keyword' || lowerKw === 'phrase' || lowerKw.includes('select all')) {
        return;
      }

      // 2. Check if the checkbox is explicitly disabled
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox && checkbox.disabled) return;
      if (row.classList.contains('sm-table-row-layout__locked')) return;

      // 3. Extract Intent
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

      // 4. MSV (Monthly Search Volume)
      let volume = '0';
      const volEl = row.querySelector('[data-testid="table-cell-volume"]');
      if (volEl) {
        volume = volEl.textContent.trim();
      }
      const rawVolumeNum = parseInt(volume.replace(/,/g, ''), 10) || 0;

      // 5. KD %
      let kd = '0';
      const kdEl = row.querySelector('[data-testid="table-cell-kd"]');
      if (kdEl) {
        kd = kdEl.textContent.trim().replace('%', '');
      }

      // 6. CPC
      let cpc = '0.00';
      const cpcEl = row.querySelector('[data-testid="table-cell-cpc"]');
      if (cpcEl) {
        cpc = cpcEl.textContent.trim().replace('$', '');
      }

      // 7. Competitive Density
      let compLvl = '0.00';
      const compEl = row.querySelector('[data-testid="table-cell-comp-lvl"]');
      if (compEl) {
        compLvl = compEl.textContent.trim();
      }

      // 8. Last Updated Freshness
      let updated = 'Recent';
      const upEl = row.querySelector('[data-testid="table-cell-updated"]') ||
                   row.querySelector('.sm-last-changes-cell__text');
      if (upEl) {
        const t = upEl.textContent.trim();
        if (t) updated = t;
      }

      // 9. Allintitle & KGR from cache
      const normKw = keyword.toLowerCase();
      const allintitleCount = cachedAllintitle[normKw] !== undefined ? cachedAllintitle[normKw] : null;
      let kgr = null;
      if (allintitleCount !== null && rawVolumeNum > 0) {
        kgr = +(allintitleCount / rawVolumeNum).toFixed(4);
      }

      items.push({
        keyword,
        intent: intent || 'Informational',
        volume: volume || '0',
        volumeNum: rawVolumeNum,
        kd: kd || '0',
        allintitle: allintitleCount,
        kgr: kgr,
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
   * Color Helpers
   */
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
    if (kgrVal === null || kgrVal === undefined) {
      return { bg: '#F3F4F6', text: '#6B7280' };
    }
    if (kgrVal < 0.25) return { bg: '#E6F4EA', text: '#137333' }; // Golden (<0.25)
    if (kgrVal <= 1.00) return { bg: '#FEF7E0', text: '#B06000' }; // Moderate (0.25-1.0)
    return { bg: '#FCE8E6', text: '#C5221F' };                     // Hard (>1.0)
  }

  /**
   * Format as Rich HTML Table for Google Sheets / Excel
   * Columns: Keyword | Intent | MSV | KD | ALLINTITLE | KGR | CPC | Comp | Updated
   */
  function formatAsStyledHTML(data) {
    const rowsHtml = data.map((r, idx) => {
      const rowNum = idx + 2; // Sheets row index (starts at 2 after header)
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9F7FC';
      const kdCol = getKdColors(r.kd);
      const intCol = getIntentColors(r.intent);
      const kgrCol = getKgrColors(r.kgr);

      // Allintitle cell: if number known, show number; else show 1-click Google search hyperlink
      const googleSearchUrl = `https://www.google.com/search?q=allintitle:%22${encodeURIComponent(r.keyword)}%22`;
      const allintitleDisplay = (r.allintitle !== null && r.allintitle !== undefined)
        ? r.allintitle
        : `<a href="${googleSearchUrl}" target="_blank" style="color: #7b2cbf; text-decoration: underline; font-weight: 600;">?? Check allintitle</a>`;

      // Live auto-calculation formula for Google Sheets / Excel: KGR = Allintitle / MSV
      // Handles plain numbers, text numbers with commas, and blank cells
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

  /**
   * Format Plain TSV
   */
  function formatAsTSV(data) {
    const header = ['Keyword', 'Intent', 'MSV', 'KD %', 'ALLINTITLE', 'KGR', 'CPC', 'Comp', 'Updated'].join('\t');
    const rows = data.map((r, idx) => {
      const rowNum = idx + 2;
      const allintitleVal = r.allintitle !== null ? r.allintitle : `=HYPERLINK("https://www.google.com/search?q=allintitle:%22"&A${rowNum}&"%22", "Check allintitle")`;
      const kgrVal = `=IF(AND(E${rowNum}<>"", C${rowNum}>0), ROUND(IF(ISNUMBER(E${rowNum}), E${rowNum}, VALUE(SUBSTITUTE(E${rowNum}, ",", ""))) / C${rowNum}, 4), "")`;
      return [r.keyword, r.intent, r.volumeNum, r.kd, allintitleVal, kgrVal, r.cpc, r.compLvl, r.updated].join('\t');
    });
    return [header, ...rows].join('\n');
  }

  function formatAsCSV(data) {
    const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
    const header = ['Keyword', 'Intent', 'MSV', 'KD %', 'ALLINTITLE', 'KGR', 'CPC', 'Comp', 'Updated'].map(esc).join(',');
    const rows = data.map((r, idx) => {
      const rowNum = idx + 2;
      const allintitleVal = r.allintitle !== null ? r.allintitle : `https://www.google.com/search?q=allintitle:%22${encodeURIComponent(r.keyword)}%22`;
      const kgrVal = `=IF(AND(E${rowNum}<>"", C${rowNum}>0), ROUND(IF(ISNUMBER(E${rowNum}), E${rowNum}, VALUE(SUBSTITUTE(E${rowNum}, ",", ""))) / C${rowNum}, 4), "")`;
      return [r.keyword, r.intent, r.volumeNum, r.kd, allintitleVal, kgrVal, r.cpc, r.compLvl, r.updated].map(esc).join(',');
    });
    return [header, ...rows].join('\n');
  }

  function formatKeywordsOnly(data) {
    return data.map(r => r.keyword).join('\n');
  }

  /**
   * Dual Clipboard Writer (text/html + text/plain)
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

  function showToast(msg, isError = false) {
    if (!shadowRoot) return;
    const toast = shadowRoot.querySelector('#sqc-toast');
    if (!toast) return;

    toast.textContent = msg;
    toast.className = 'sqc-toast show' + (isError ? ' error' : '');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = 'sqc-toast';
    }, 2800);
  }

  /**
   * Automated KGR Runner: Checks allintitle for detected keywords
   */
  async function runAutoCheckKgr() {
    if (isCheckingKgr) return;
    isCheckingKgr = true;

    extractKeywords();
    if (!cachedKeywords.length) {
      showToast('No keywords to check', true);
      isCheckingKgr = false;
      return;
    }

    showToast(`? Checking KGR for ${cachedKeywords.length} keywords...`);

    let updatedCount = 0;
    for (let i = 0; i < cachedKeywords.length; i++) {
      const kw = cachedKeywords[i].keyword;
      const normKw = kw.toLowerCase();

      // If already cached, skip
      if (cachedAllintitle[normKw] !== undefined) {
        continue;
      }

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
          updatedCount++;
        }
      } catch (e) {
        console.warn('Auto-check fetch error for:', kw, e);
      }

      // Safe pause between requests to prevent Google CAPTCHA
      await new Promise(r => setTimeout(r, 1200));
    }

    isCheckingKgr = false;
    extractKeywords();
    renderWidget();
    showToast(`? KGR check complete! Click "Copy Styled" to paste into Sheets.`);
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
          width: 268px;
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
          margin-bottom: 8px;
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
          max-width: 180px;
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
          font-size: 11.5px;
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

        .btn-kgr {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: 100%;
          padding: 6.5px 8px;
          font-size: 11px;
          font-weight: 700;
          color: #fcedff;
          background: rgba(56, 18, 102, 0.7);
          border: 1px solid rgba(199, 125, 255, 0.3);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-kgr:hover {
          background: rgba(85, 28, 155, 0.85);
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
          <span class="query-txt" title="${query}">"${query}"</span>
        </div>

        <div class="actions-col">
          <button type="button" class="btn-main" id="btn-tsv" title="Copies styled colored table with KGR formulas ready to paste into Google Sheets">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy Styled (KGR + Sheets)
          </button>

          <button type="button" class="btn-kgr" id="btn-auto-kgr" title="Auto-queries Google allintitle count for all 10 keywords">
            <span>?</span>
            <span>${isCheckingKgr ? 'Checking KGR...' : 'Auto-Check KGR (Google)'}</span>
          </button>

          <div class="btn-row">
            <button type="button" class="btn-sub" id="btn-csv" title="Copy standard CSV">CSV</button>
            <button type="button" class="btn-sub" id="btn-list" title="Copy plain keyword list">List Only</button>
          </div>
        </div>

        <div class="fixed-footer">
          Made With ?? By <a href="https://r1fat.pages.dev" target="_blank" rel="noopener noreferrer" class="r1fat-link">r1fat</a>
        </div>
      </div>
    `;

    // Event handlers inside Shadow DOM
    const btnTsv = shadowRoot.querySelector('#btn-tsv');
    const btnAutoKgr = shadowRoot.querySelector('#btn-auto-kgr');
    const btnCsv = shadowRoot.querySelector('#btn-csv');
    const btnList = shadowRoot.querySelector('#btn-list');

    btnTsv?.addEventListener('click', () => {
      extractKeywords();
      if (!cachedKeywords.length) {
        showToast('No keywords detected yet', true);
        return;
      }
      copyRichTable(cachedKeywords).then(() => {
        showToast(`? Copied ${cachedKeywords.length} KGR rows for Sheets!`);
      }).catch(() => showToast('Copy failed', true));
    });

    btnAutoKgr?.addEventListener('click', () => {
      runAutoCheckKgr();
    });

    btnCsv?.addEventListener('click', () => {
      extractKeywords();
      if (!cachedKeywords.length) {
        showToast('No keywords detected yet', true);
        return;
      }
      copyPlainText(formatAsCSV(cachedKeywords)).then(() => {
        showToast(`?? Copied ${cachedKeywords.length} as CSV!`);
      }).catch(() => showToast('Copy failed', true));
    });

    btnList?.addEventListener('click', () => {
      extractKeywords();
      if (!cachedKeywords.length) {
        showToast('No keywords detected yet', true);
        return;
      }
      copyPlainText(formatKeywordsOnly(cachedKeywords)).then(() => {
        showToast(`?? Copied ${cachedKeywords.length} plain keywords!`);
      }).catch(() => showToast('Copy failed', true));
    });
  }

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_DATA') {
      loadStoredKgr(() => {
        const data = extractKeywords();
        sendResponse({
          success: true,
          query: getSearchQuery(),
          count: data.length,
          keywords: data
        });
      });
      return true;
    }
  });

  // Watch for storage changes (e.g. When Google content script captures a count)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      let hasKgr = false;
      for (const key of Object.keys(changes)) {
        if (key.startsWith('kgr_')) {
          cachedAllintitle[key.slice(4)] = changes[key].newValue;
          hasKgr = true;
        }
      }
      if (hasKgr) {
        extractKeywords();
        renderWidget();
      }
    });
  }

  // Observe SPA DOM updates
  let updateTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      loadStoredKgr(renderWidget);
    }, 400);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', () => {
    setTimeout(() => loadStoredKgr(renderWidget), 500);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadStoredKgr(renderWidget));
  } else {
    setTimeout(() => loadStoredKgr(renderWidget), 600);
  }
})();
