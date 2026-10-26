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
    popupToastEl.className = 'toast show' + (isError ? ' error' : '');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      popupToastEl.className = 'toast';
    }, 2500);
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
            <div class="kw-stat"><span class="kw-stat-label">Allintitle:</span> <span class="kw-stat-val">${kw.allintitle !== null ? kw.allintitle.toLocaleString() : '—'}</span></div>
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
