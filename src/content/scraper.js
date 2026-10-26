/**
 * Semrush Quick Copy - DOM Scraper Module
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  window.SQC = window.SQC || {};

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
   * Scrape active keyword rows with robust filters
   */
  function extractKeywords(cachedAllintitle) {
    const rows = document.querySelectorAll('div[data-testid="table-row"], div.sm-table-layout__row, div[role="row"]');
    const items = [];
    const cache = cachedAllintitle || {};

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

      // 2. Check if the checkbox is explicitly disabled or row is locked
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
      const allintitleCount = cache[normKw] !== undefined ? cache[normKw] : null;
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

    return items;
  }

  window.SQC.Scraper = {
    getSearchQuery,
    extractKeywords
  };
})();
