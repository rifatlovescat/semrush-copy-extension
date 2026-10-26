/**
 * Semrush Quick Copy - Google Search allintitle Auto-Grabber
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  // Only run on Google search pages
  if (!window.location.hostname.includes('google.') || !window.location.pathname.startsWith('/search')) {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || '';

  // Check if query is an allintitle search
  if (!query.toLowerCase().startsWith('allintitle:')) {
    return;
  }

  // Extract clean keyword target
  // e.g. allintitle:"club penguin" -> club penguin, allintitle:rifat -> rifat
  const rawTarget = query.slice(11).trim().replace(/^["']|["']$/g, '').trim().toLowerCase();
  if (!rawTarget || rawTarget.includes('select all') || rawTarget === 'keyword') return;

  function extractGoogleResultsCount() {
    // 1. Check standard #result-stats
    const statsEl = document.getElementById('result-stats');
    let text = statsEl ? statsEl.textContent : '';

    // 2. Fallback to any element matching "About X results" or "X results"
    if (!text) {
      const match = document.body.innerText.match(/(?:About\s+)?([0-9,]+)\s+results/i);
      if (match) text = match[0];
    }

    // 3. Check for 0 results ("did not match any documents")
    const noResults = document.body.innerText.includes('did not match any documents') ||
                      document.body.innerText.includes('No results found for');
    if (noResults) {
      return 0;
    }

    if (!text) return null;

    // Parse the number e.g. "About 174 results (0.29 seconds)" -> 174
    const countMatch = text.match(/([0-9,]+)\s+result/i);
    if (countMatch && countMatch[1]) {
      const num = parseInt(countMatch[1].replace(/,/g, ''), 10);
      return isNaN(num) ? null : num;
    }

    return null;
  }

  function showGrabberBadge(keyword, count) {
    const badge = document.createElement('div');
    badge.id = 'sqc-google-grabber-badge';
    badge.innerHTML = `
      <div style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        background: linear-gradient(135deg, #18082e 0%, #0d0219 100%);
        border: 1px solid #c77dff;
        box-shadow: 0 10px 30px rgba(0,0,0,0.7), 0 0 18px rgba(199, 125, 255, 0.4);
        border-radius: 12px;
        padding: 10px 16px;
        color: #fcedff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: sqcSlideUp 0.3s ease;
      ">
        <span style="width: 8px; height: 8px; background: #c77dff; border-radius: 50%; box-shadow: 0 0 8px #c77dff;"></span>
        <div>
          <div style="font-weight: 700; color: #ffffff;">KGR Grabbed: <span style="color: #e0aaff;">${count.toLocaleString()}</span> allintitle results</div>
          <div style="font-size: 11px; color: #bfa7d9;">Saved for keyword: "${keyword}"</div>
        </div>
      </div>
      <style>
        @keyframes sqcSlideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    `;
    document.body.appendChild(badge);

    setTimeout(() => {
      badge.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      badge.style.opacity = '0';
      badge.style.transform = 'translateY(15px)';
      setTimeout(() => badge.remove(), 400);
    }, 3200);
  }

  // Run detection
  function runGrabber() {
    const count = extractGoogleResultsCount();
    if (count !== null && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const storageKey = 'kgr_' + rawTarget;
      chrome.storage.local.set({ [storageKey]: count }, () => {
        showGrabberBadge(rawTarget, count);
      });
    }
  }

  // Google results can load dynamically
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runGrabber);
  } else {
    setTimeout(runGrabber, 500);
  }
})();
