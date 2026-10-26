/**
 * Semrush Quick Copy - Main Content Script Entry Point
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  window.SQC = window.SQC || {};

  let cachedAllintitle = {};
  let cachedKeywords = [];
  let currentQuery = '';

  function refreshDataAndUI() {
    window.SQC.Storage.loadStoredKgr((stored) => {
      cachedAllintitle = stored || {};
      cachedKeywords = window.SQC.Scraper.extractKeywords(cachedAllintitle);
      currentQuery = window.SQC.Scraper.getSearchQuery();

      window.SQC.WidgetUI.renderWidget(cachedKeywords, currentQuery, handleAutoKgr);
    });
  }

  function handleAutoKgr() {
    if (window.SQC.KgrRunner.isRunnerBusy()) return;

    const missing = cachedKeywords.filter((k) => {
      const norm = (k.keyword || '').toLowerCase();
      return cachedAllintitle[norm] === undefined || cachedAllintitle[norm] === null;
    });

    if (missing.length > 0 && missing.length < cachedKeywords.length) {
      window.SQC.WidgetUI.showToast(`⚡ Retrying ${missing.length} missing KGR keywords...`);
    } else {
      window.SQC.WidgetUI.showToast(`⚡ Checking KGR for ${cachedKeywords.length} keywords...`);
    }

    window.SQC.WidgetUI.renderWidget(cachedKeywords, currentQuery, handleAutoKgr);

    window.SQC.KgrRunner.runAutoCheckKgr(
      cachedKeywords,
      cachedAllintitle,
      (current, total, kw) => {
        window.SQC.WidgetUI.showToast(`🔍 (${current}/${total}): ${kw}`);
      },
      (updatedCache, newlyFound, totalChecked) => {
        cachedAllintitle = updatedCache;
        refreshDataAndUI();
        const resolved = cachedKeywords.filter((k) => {
          const norm = (k.keyword || '').toLowerCase();
          return cachedAllintitle[norm] !== undefined && cachedAllintitle[norm] !== null;
        }).length;
        window.SQC.WidgetUI.showToast(`✨ KGR updated! (${resolved}/${cachedKeywords.length} resolved)`);
      }
    );
  }

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_DATA') {
      window.SQC.Storage.loadStoredKgr((stored) => {
        cachedAllintitle = stored || {};
        cachedKeywords = window.SQC.Scraper.extractKeywords(cachedAllintitle);
        currentQuery = window.SQC.Scraper.getSearchQuery();

        sendResponse({
          success: true,
          query: currentQuery,
          keywords: cachedKeywords,
          count: cachedKeywords.length
        });
      });
      return true; // async sendResponse
    }
  });

  // Mutation observer to detect dynamic table loads or query changes
  let debounceTimer = null;
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length > 0) {
        shouldUpdate = true;
        break;
      }
    }
    if (shouldUpdate) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshDataAndUI();
      }, 500);
    }
  });

  // Bootstrap
  function init() {
    observer.observe(document.body, { childList: true, subtree: true });
    refreshDataAndUI();
    setTimeout(refreshDataAndUI, 600);
    setTimeout(refreshDataAndUI, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
