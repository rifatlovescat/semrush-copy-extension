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
   * Robust parser for Google allintitle search results
   * Distinguishes between actual 0 results, positive counts, and temporary blocks/failures
   */
  function parseGoogleResultCount(html) {
    if (!html || typeof html !== 'string') return null;

    // 1. Detect Captcha / Block / Rate limit -> do NOT treat as 0
    if (
      html.includes('unusual traffic') ||
      html.includes('google.com/sorry') ||
      html.includes('recaptcha') ||
      html.includes('solving the above')
    ) {
      console.warn('[SQC] Google rate-limit or captcha challenge encountered.');
      return null;
    }

    // 2. Check explicit zero results
    if (
      html.includes('did not match any documents') ||
      html.includes('No results found for') ||
      html.includes('Make sure that all words are spelled correctly') ||
      html.includes('Try different keywords')
    ) {
      return 0;
    }

    // 3. Check inside #result-stats
    const resultStatsMatch = html.match(/id="result-stats"[^>]*>([\s\S]*?)<\/div>/i);
    const statsText = resultStatsMatch ? resultStatsMatch[1] : html;

    // Check for "About X results" or "X results"
    const countMatch = statsText.match(/(?:About|approximately|Page\s+\d+\s+of\s+about)?\s*([0-9,]+)\s+results?/i);
    if (countMatch && countMatch[1]) {
      const num = parseInt(countMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(num)) return num;
    }

    // 4. Check for singular "1 result"
    if (/(?:About\s+)?1\s+result\b/i.test(statsText)) {
      return 1;
    }

    // 5. Fallback regex anywhere in HTML
    const fallbackMatch = html.match(/(?:About\s+)?([0-9,]+)\s+results/i);
    if (fallbackMatch && fallbackMatch[1]) {
      const num = parseInt(fallbackMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(num)) return num;
    }

    return null;
  }

  /**
   * Run background Google allintitle checks
   * Automatically isolates and retries any missing or failed keywords
   */
  async function runAutoCheckKgr(keywords, cachedAllintitle, onProgress, onDone) {
    if (isCheckingKgr) return;
    if (!keywords || !keywords.length) return;

    isCheckingKgr = true;
    const cache = cachedAllintitle || {};

    // 1. Identify keywords that need checking (missing or previously failed)
    const missingKeywords = keywords.filter((item) => {
      const norm = (item.keyword || '').toLowerCase();
      return cache[norm] === undefined || cache[norm] === null;
    });

    // If all are already checked, user re-clicked to re-verify all; otherwise target the missing ones
    const targets = missingKeywords.length > 0 ? missingKeywords : keywords;
    let newlyFound = 0;

    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      const kw = item.keyword;
      const normKw = kw.toLowerCase();

      if (onProgress) {
        onProgress(i + 1, targets.length, kw);
      }

      try {
        const searchUrl = `https://www.google.com/search?q=allintitle:%22${encodeURIComponent(kw)}%22`;
        const res = await fetch(searchUrl, { mode: 'cors' });
        if (res.ok) {
          const html = await res.text();
          const count = parseGoogleResultCount(html);

          if (count !== null) {
            cache[normKw] = count;
            newlyFound++;
            if (window.SQC.Storage && window.SQC.Storage.saveKgrCount) {
              window.SQC.Storage.saveKgrCount(kw, count);
            }
          } else {
            console.warn('[SQC] Could not extract count for:', kw);
          }
        } else {
          console.warn('[SQC] Google response not OK (HTTP ' + res.status + ') for:', kw);
        }
      } catch (err) {
        console.warn('[SQC] Network error during KGR check for:', kw, err);
      }

      // Polite delay between queries (1.3s)
      await new Promise(r => setTimeout(r, 1300));
    }

    isCheckingKgr = false;
    if (onDone) {
      onDone(cache, newlyFound, targets.length);
    }
  }

  window.SQC.KgrRunner = {
    isRunnerBusy,
    parseGoogleResultCount,
    runAutoCheckKgr
  };
})();
