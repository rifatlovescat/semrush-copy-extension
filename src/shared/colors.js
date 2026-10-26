/**
 * Semrush Quick Copy - Color Helpers
 * Author: r1fat (https://r1fat.pages.dev)
 */

(function () {
  'use strict';

  window.SQC = window.SQC || {};

  /**
   * Keyword Difficulty (KD %) Color Palette
   * Semrush standard difficulty bands
   */
  function getKdColors(kdStr) {
    const kd = parseInt(kdStr, 10) || 0;
    if (kd < 30) return { bg: '#E6F4EA', text: '#137333' }; // Very Easy (<30)
    if (kd < 50) return { bg: '#FEF7E0', text: '#B06000' }; // Possible (30-49)
    if (kd < 70) return { bg: '#FEEDDC', text: '#C05621' }; // Difficult (50-69)
    if (kd < 85) return { bg: '#FCE8E6', text: '#C5221F' }; // Hard (70-84)
    return { bg: '#F8D7DA', text: '#721C24' };              // Very Hard (85+)
  }

  /**
   * Search Intent Color Palette
   * Matches Semrush Intent Badges (I, C, T, N)
   */
  function getIntentColors(intent) {
    const i = (intent || '').toLowerCase();
    if (i.includes('trans')) return { bg: '#FCE8E6', text: '#C5221F' }; // Transactional (Red)
    if (i.includes('comm'))  return { bg: '#FEF7E0', text: '#B06000' }; // Commercial (Yellow/Amber)
    if (i.includes('nav'))   return { bg: '#E8F0FE', text: '#1A73E8' }; // Navigational (Blue)
    return { bg: '#E8F4FD', text: '#1B66C9' };                          // Informational (Light Blue)
  }

  /**
   * Keyword Golden Ratio (KGR) Color Palette
   * Formula: KGR = Allintitle Results / Monthly Search Volume
   */
  function getKgrColors(kgrVal) {
    if (kgrVal === null || kgrVal === undefined) {
      return { bg: '#F3F4F6', text: '#6B7280' }; // Not checked yet
    }
    const val = parseFloat(kgrVal);
    if (isNaN(val)) return { bg: '#F3F4F6', text: '#6B7280' };
    if (val < 0.25) return { bg: '#E6F4EA', text: '#137333' }; // Golden (<0.25)
    if (val <= 1.0) return { bg: '#FEF7E0', text: '#B06000' }; // Moderate (0.25-1.0)
    return { bg: '#FCE8E6', text: '#C5221F' };                 // Hard (>1.0)
  }

  window.SQC.Colors = {
    getKdColors,
    getIntentColors,
    getKgrColors
  };
})();
