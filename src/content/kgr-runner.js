/**
 * Semrush Quick Copy - KGR Google Search Runner
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  window.SQC = window.SQC || {};

  let isCheckingKgr = false;

  function isRunnerBusy() {
    return isCheckingKgr;
  }

  /**
   * Run background Google allintitle checks for each keyword
   */
  async function runAutoCheckKgr(keywords, cachedAllintitle, onProgress, onDone) {
    if (isCheckingKgr) return;
    if (!keywords || !keywords.length) return;

    isCheckingKgr = true;
    const cache = cachedAllintitle || {};

    for (let i = 0; i < keywords.length; i++) {
      const item = keywords[i];
      const kw = item.keyword;
      const normKw = kw.toLowerCase();

      if (onProgress) {
        onProgress(i + 1, keywords.length, kw);
      }

      // If already cached, skip network fetch
      if (cache[normKw] !== undefined && cache[normKw] !== null) {
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
          } else if (html.includes('did not match any documents') || html.includes('No results found for')) {
            count = 0;
          }

          cache[normKw] = count;
          if (window.SQC.Storage && window.SQC.Storage.saveKgrCount) {
            window.SQC.Storage.saveKgrCount(kw, count);
          }
        }
      } catch (err) {
        console.warn('[SQC] KGR background check error for keyword:', kw, err);
      }

      // Polite delay between queries to avoid rate limits
      await new Promise(r => setTimeout(r, 1200));
    }

    isCheckingKgr = false;
    if (onDone) {
      onDone(cache);
    }
  }

  window.SQC.KgrRunner = {
    isRunnerBusy,
    runAutoCheckKgr
  };
})();
