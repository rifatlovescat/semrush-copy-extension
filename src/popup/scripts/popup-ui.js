/**
 * Semrush Quick Copy - Popup UI Renderer Module
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  window.SQC = window.SQC || {};

  let toastTimer = null;

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(message, isError = false) {
    const popupToastEl = document.getElementById('popup-toast');
    if (!popupToastEl) return;

    popupToastEl.textContent = message;
    popupToastEl.className = 'popup-toast show' + (isError ? ' error' : '');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      popupToastEl.className = 'popup-toast';
    }, 2400);
  }

  function renderKeywords(keywords, query, cachedAllintitle) {
    const queryNameEl = document.getElementById('query-name');
    const countBadgeEl = document.getElementById('keyword-count-badge');
    const keywordsListEl = document.getElementById('keywords-list');

    const cache = cachedAllintitle || {};
    const processedKeywords = (keywords || []).map((r) => {
      const normKw = (r.keyword || '').toLowerCase();
      const allintitleCount = cache[normKw] !== undefined ? cache[normKw] : (r.allintitle !== undefined ? r.allintitle : null);
      const volumeNum = r.volumeNum || parseInt(String(r.volume || '0').replace(/,/g, ''), 10) || 0;
      let kgr = null;
      if (allintitleCount !== null && volumeNum > 0) {
        kgr = +(allintitleCount / volumeNum).toFixed(4);
      }
      return { ...r, allintitle: allintitleCount, volumeNum, kgr };
    });

    if (queryNameEl) {
      queryNameEl.textContent = query ? `"${query}"` : 'Active Page';
    }
    if (countBadgeEl) {
      countBadgeEl.textContent = `${processedKeywords.length} Found`;
    }

    if (!keywordsListEl) return processedKeywords;

    if (!processedKeywords.length) {
      keywordsListEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width: 32px; height: 32px; color: var(--accent-lavender);">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No active keywords detected on this page.<br>Make sure you have searched for a keyword on Semrush.</p>
        </div>
      `;
      return processedKeywords;
    }

    keywordsListEl.innerHTML = processedKeywords.map((kw, i) => {
      const intentClass = `kw-intent-${(kw.intent || 'informational').toLowerCase()}`;

      let kgrBadge = '';
      if (kw.kgr !== null && kw.kgr !== undefined) {
        const kgrClass = kw.kgr < 0.25 ? 'kw-kgr-golden' : (kw.kgr <= 1.0 ? 'kw-kgr-moderate' : 'kw-kgr-hard');
        const kgrLabel = kw.kgr < 0.25 ? '⭐ Golden' : (kw.kgr <= 1.0 ? '⚡ Moderate' : '⛔ Hard');
        kgrBadge = `<span class="kw-kgr-pill ${kgrClass}" title="KGR: ${kw.kgr}">${kw.kgr} (${kgrLabel})</span>`;
      }

      const googleSearchUrl = `https://www.google.com/search?q=allintitle:%22${encodeURIComponent(kw.keyword)}%22`;
      const allintitleDisplay = (kw.allintitle !== null && kw.allintitle !== undefined)
        ? `<span class="kw-stat-val">${kw.allintitle.toLocaleString()}</span>`
        : `<a href="${googleSearchUrl}" target="_blank" class="stat-missing" title="Click to search allintitle on Google">🔍 Check</a>`;

      return `
        <div class="kw-card" data-idx="${i}">
          <div class="kw-card-top">
            <div class="kw-title-wrap">
              <span class="kw-num">${i + 1}.</span>
              <span class="kw-text" data-copy-kw="${escapeHtml(kw.keyword)}" title="Click to copy keyword text">${escapeHtml(kw.keyword)}</span>
            </div>
            <div class="kw-actions">
              ${kgrBadge}
              <span class="kw-intent-badge ${intentClass}">${escapeHtml(kw.intent)}</span>
              <button type="button" class="btn-copy-card" data-copy-idx="${i}" title="Copy this single row for Google Sheets (KGR formatted)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="card-copy-icon">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
              </button>
            </div>
          </div>
          <div class="kw-card-bottom">
            <div class="kw-stat"><span class="kw-stat-label">MSV:</span> <span class="kw-stat-val">${kw.volumeNum.toLocaleString()}</span></div>
            <div class="kw-stat"><span class="kw-stat-label">KD:</span> <span class="kw-stat-val">${kw.kd}%</span></div>
            <div class="kw-stat"><span class="kw-stat-label">Allintitle:</span> ${allintitleDisplay}</div>
            <div class="kw-stat"><span class="kw-stat-label">CPC:</span> <span class="kw-stat-val">$${kw.cpc}</span></div>
          </div>
        </div>
      `;
    }).join('');

    return processedKeywords;
  }

  window.SQC.PopupUI = {
    escapeHtml,
    showToast,
    renderKeywords
  };
})();
