/**
 * Semrush Quick Copy - Table & Export Formatters
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  window.SQC = window.SQC || {};

  /**
   * Format as Rich HTML Table for Google Sheets / Excel
   * Columns: Keyword | Intent | MSV | KD | ALLINTITLE | KGR | CPC | Comp | Freshness
   */
  function formatAsStyledHTML(data) {
    const { getKdColors, getIntentColors, getKgrColors } = window.SQC.Colors;

    const rowsHtml = (data || []).map((r, idx) => {
      const rowNum = idx + 2; // Sheets row index (starts at 2 after header)
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9F7FC';
      const kdCol = getKdColors(r.kd);
      const intCol = getIntentColors(r.intent);
      const kgrCol = getKgrColors(r.kgr);

      // Allintitle cell: if number known, show number; else show 1-click Google search hyperlink
      const googleSearchUrl = `https://www.google.com/search?q=allintitle:%22${encodeURIComponent(r.keyword)}%22`;
      const allintitleDisplay = (r.allintitle !== null && r.allintitle !== undefined)
        ? r.allintitle
        : `<a href="${googleSearchUrl}" target="_blank" style="color: #7b2cbf; text-decoration: underline; font-weight: 600;">🔍 Check allintitle</a>`;

      // Live auto-calculation formula for Google Sheets / Excel: KGR = Allintitle / MSV
      // Protected against #DIV/0! and formatted numbers with commas
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
    const rows = (data || []).map((r, idx) => {
      const rowNum = idx + 2;
      const allintitleVal = r.allintitle !== null ? r.allintitle : `=HYPERLINK("https://www.google.com/search?q=allintitle:%22"&A${rowNum}&"%22", "Check allintitle")`;
      const kgrVal = `=IF(AND(E${rowNum}<>"", C${rowNum}>0), ROUND(IF(ISNUMBER(E${rowNum}), E${rowNum}, VALUE(SUBSTITUTE(E${rowNum}, ",", ""))) / C${rowNum}, 4), "")`;
      return [r.keyword, r.intent, r.volumeNum, r.kd, allintitleVal, kgrVal, r.cpc, r.compLvl, r.updated].join('\t');
    });
    return [header, ...rows].join('\n');
  }

  /**
   * Format Standard RFC4180 CSV
   */
  function formatAsCSV(data) {
    const esc = (s) => `"${String(s !== null && s !== undefined ? s : '').replace(/"/g, '""')}"`;
    const header = ['Keyword', 'Intent', 'MSV', 'KD %', 'ALLINTITLE', 'KGR', 'CPC', 'Comp', 'Updated'].map(esc).join(',');
    const rows = (data || []).map((r, idx) => {
      const rowNum = idx + 2;
      const allintitleVal = (r.allintitle !== null && r.allintitle !== undefined)
        ? r.allintitle
        : `https://www.google.com/search?q=allintitle:%22${encodeURIComponent(r.keyword)}%22`;
      const kgrVal = `=IF(AND(E${rowNum}<>"", C${rowNum}>0), ROUND(IF(ISNUMBER(E${rowNum}), E${rowNum}, VALUE(SUBSTITUTE(E${rowNum}, ",", ""))) / C${rowNum}, 4), "")`;
      return [r.keyword, r.intent, r.volumeNum, r.kd, allintitleVal, kgrVal, r.cpc, r.compLvl, r.updated].map(esc).join(',');
    });
    return [header, ...rows].join('\n');
  }

  /**
   * Plain keyword list (1 per line)
   */
  function formatKeywordsOnly(data) {
    return (data || []).map(r => r.keyword).join('\n');
  }

  /**
   * Direct CSV File Downloader with UTF-8 BOM
   */
  function downloadCsvFile(data, queryStr) {
    const csvContent = formatAsCSV(data);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const query = queryStr || 'semrush_keywords';
    const cleanSlug = query.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    const filename = `${cleanSlug}_kgr_keywords.csv`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
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
      console.warn('ClipboardItem error, fallback to execCommand:', e);
    }

    // Fallback using execCommand copy event
    const listener = (e) => {
      e.preventDefault();
      e.clipboardData.setData('text/html', htmlContent);
      e.clipboardData.setData('text/plain', plainText);
    };
    document.addEventListener('copy', listener, { once: true });
    const success = document.execCommand('copy');
    if (!success) {
      throw new Error('execCommand copy failed');
    }
    return true;
  }

  /**
   * Plain Text Clipboard Writer
   */
  async function copyPlainText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('Copy command failed');
    return true;
  }

  window.SQC.Formatters = {
    formatAsStyledHTML,
    formatAsTSV,
    formatAsCSV,
    formatKeywordsOnly,
    downloadCsvFile,
    copyRichTable,
    copyPlainText
  };
})();
