/**
 * Semrush Quick Copy - Storage Helpers
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  window.SQC = window.SQC || {};

  /**
   * Load stored allintitle results from chrome.storage.local
   * Prunes any stale junk keys (e.g. 'select all keywords') automatically
   */
  function loadStoredKgr(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(null, (items) => {
        const result = {};
        for (const [key, val] of Object.entries(items || {})) {
          if (key.startsWith('kgr_')) {
            const kw = key.slice(4).toLowerCase();
            if (kw.includes('select all') || kw === 'keyword' || kw === 'phrase') {
              chrome.storage.local.remove(key); // prune stale/invalid keys
            } else {
              result[kw] = val;
            }
          }
        }
        if (callback) callback(result);
      });
    } else {
      if (callback) callback({});
    }
  }

  /**
   * Save a single keyword allintitle count into chrome.storage.local
   */
  function saveKgrCount(keyword, count) {
    const norm = (keyword || '').trim().toLowerCase();
    if (!norm || norm.includes('select all') || norm === 'keyword') return;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ ['kgr_' + norm]: count });
    }
  }

  window.SQC.Storage = {
    loadStoredKgr,
    saveKgrCount
  };
})();
