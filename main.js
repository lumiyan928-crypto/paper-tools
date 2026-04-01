/**
 * 学术论文筛选器 — 多学科研究方法识别
 * 核心模块：学科选择、CSV解析、方法识别引擎、UI渲染
 */

import { DISCIPLINES, getDiscipline, getTagClass } from './disciplines.js';

// ========== 全局状态 ==========
let currentDiscipline = null;  // 当前选中学科
let allPapers = [];
let filteredPapers = [];
let activeFilters = new Set();
let allTags = new Map();

// 暴露到window供reader.js访问
window.allPapers = allPapers;
window.DISCIPLINES = DISCIPLINES;

// ========== CSV 解析器 ==========
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) {
        lines.push(current);
      }
      current = '';
      if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++;
      }
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    lines.push(current);
  }

  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ========== 研究方法识别引擎（动态学科） ==========
function analyzePaper(paper, discipline) {
  const title = (paper['Document Title'] || '').toLowerCase();
  const abstract = (paper['Abstract'] || '').toLowerCase();
  const authorKeywords = (paper['Author Keywords'] || '').toLowerCase();
  const ieeeTerms = (paper['IEEE Terms'] || paper['Index Terms'] || '').toLowerCase();

  const matchedMethods = [];

  for (let methodIdx = 0; methodIdx < discipline.methods.length; methodIdx++) {
    const method = discipline.methods[methodIdx];
    let score = 0;
    const matchedEvidence = [];

    for (const kw of method.keywords) {
      if (abstract.includes(kw)) {
        score += 3;
        matchedEvidence.push({ source: '摘要', term: kw });
      }
      if (title.includes(kw)) {
        score += 5;
        matchedEvidence.push({ source: '标题', term: kw });
      }
      if (authorKeywords.includes(kw)) {
        score += 4;
        matchedEvidence.push({ source: '作者关键词', term: kw });
      }
      if (ieeeTerms.includes(kw)) {
        score += 2;
        matchedEvidence.push({ source: '索引术语', term: kw });
      }
    }

    const origAbstract = paper['Abstract'] || '';
    for (const pattern of (method.abstractPatterns || [])) {
      const match = origAbstract.match(pattern);
      if (match) {
        score += 2;
        const exists = matchedEvidence.some(e =>
          e.term.toLowerCase() === match[0].toLowerCase()
        );
        if (!exists) {
          matchedEvidence.push({ source: '摘要模式', term: match[0] });
        }
      }
    }

    if (score > 0) {
      const uniqueEvidence = [];
      const seen = new Set();
      for (const ev of matchedEvidence) {
        const key = `${ev.source}-${ev.term.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueEvidence.push(ev);
        }
      }

      matchedMethods.push({
        method: { ...method, tagClass: getTagClass(methodIdx) },
        score,
        confidence: Math.min(score / 10, 1),
        evidence: uniqueEvidence
      });
    }
  }

  matchedMethods.sort((a, b) => b.score - a.score);

  return {
    isDesignMethod: matchedMethods.length > 0,
    methods: matchedMethods,
    totalScore: matchedMethods.reduce((sum, m) => sum + m.score, 0)
  };
}

// ========== UI 渲染 ==========
function renderStats() {
  const total = allPapers.length;
  const matched = allPapers.filter(p => p._analysis.isDesignMethod).length;
  document.getElementById('totalCount').textContent = total;
  document.getElementById('designCount').textContent = matched;
  document.getElementById('hitRate').textContent = total > 0
    ? (matched / total * 100).toFixed(1) + '%' : '0%';
  const statsBar = document.getElementById('statsBar');
  statsBar.classList.remove('hidden');
}

function renderTagFilters() {
  const container = document.getElementById('tagFilters');
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `tag-btn${activeFilters.size === 0 ? ' active' : ''}`;
  allBtn.innerHTML = `全部 <span class="count">${allPapers.filter(p => p._analysis.isDesignMethod).length}</span>`;
  allBtn.addEventListener('click', () => {
    activeFilters.clear();
    renderTagFilters();
    applyFilters();
  });
  container.appendChild(allBtn);

  const sortedTags = [...allTags.entries()].sort((a, b) => b[1] - a[1]);
  for (const [tagId, count] of sortedTags) {
    if (!currentDiscipline) continue;
    const methodIdx = currentDiscipline.methods.findIndex(m => m.id === tagId);
    const method = currentDiscipline.methods[methodIdx];
    if (!method) continue;

    const btn = document.createElement('button');
    const isActive = activeFilters.has(tagId);
    btn.className = `tag-btn${isActive ? ' active' : ''}`;
    btn.innerHTML = `${method.label} <span class="count">${count}</span>`;
    btn.addEventListener('click', () => {
      if (activeFilters.has(tagId)) {
        activeFilters.delete(tagId);
      } else {
        activeFilters.add(tagId);
      }
      renderTagFilters();
      applyFilters();
    });
    container.appendChild(btn);
  }
}

function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

  filteredPapers = allPapers.filter(p => {
    if (!p._analysis.isDesignMethod) return false;

    if (activeFilters.size > 0) {
      const paperTags = p._analysis.methods.map(m => m.method.id);
      const hasMatch = [...activeFilters].some(f => paperTags.includes(f));
      if (!hasMatch) return false;
    }

    if (searchTerm) {
      const title = (p['Document Title'] || '').toLowerCase();
      const authors = (p['Authors'] || '').toLowerCase();
      if (!title.includes(searchTerm) && !authors.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  filteredPapers.sort((a, b) => b._analysis.totalScore - a._analysis.totalScore);
  renderPaperList();
}

function renderPaperList() {
  const container = document.getElementById('paperList');
  const noResults = document.getElementById('noResults');

  if (filteredPapers.length === 0) {
    container.innerHTML = '';
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');

  container.innerHTML = filteredPapers.map((paper, idx) => {
    const analysis = paper._analysis;
    const title = paper['Document Title'] || '未知标题';
    const authors = paper['Authors'] || '未知作者';
    const year = paper['Publication Year'] || '';
    const abstract = paper['Abstract'] || '';
    const doi = paper['DOI'] || '';
    const pdfLink = paper['PDF Link'] || '';

    const tagsHTML = analysis.methods.map(m =>
      `<span class="method-tag ${m.method.tagClass}">${m.method.label}</span>`
    ).join('');

    const maxConf = Math.max(...analysis.methods.map(m => m.confidence));
    const confClass = maxConf >= 0.7 ? 'confidence-high' : maxConf >= 0.4 ? 'confidence-medium' : 'confidence-low';
    const confLabel = maxConf >= 0.7 ? '高置信度' : maxConf >= 0.4 ? '中置信度' : '低置信度';

    const shortAbstract = abstract.length > 200
      ? abstract.substring(0, 200) + '…'
      : abstract;

    const authorList = authors.split(';').map(a => a.trim()).filter(Boolean);
    const displayAuthors = authorList.length > 3
      ? authorList.slice(0, 3).join(', ') + ` 等 ${authorList.length} 人`
      : authorList.join(', ');

    let linksHTML = '';
    if (pdfLink) {
      linksHTML += `<a href="${escapeHTML(pdfLink)}" target="_blank" rel="noopener" class="paper-link-btn" title="PDF" onclick="event.stopPropagation()"><i class="ri-file-pdf-2-line"></i></a>`;
    }
    if (doi) {
      linksHTML += `<a href="https://doi.org/${escapeHTML(doi)}" target="_blank" rel="noopener" class="paper-link-btn" title="DOI" onclick="event.stopPropagation()"><i class="ri-external-link-line"></i></a>`;
    }

    return `
      <div class="paper-card" style="animation-delay: ${idx * 0.04}s" data-index="${idx}">
        <div class="paper-index">${idx + 1}</div>
        <div class="paper-body">
          <div class="paper-title">${escapeHTML(title)}</div>
          <div class="paper-meta">${escapeHTML(displayAuthors)}${year ? ' · ' + year : ''}</div>
          <div class="paper-tags">${tagsHTML}</div>
          <div class="paper-abstract">${escapeHTML(shortAbstract)}</div>
          <div class="paper-footer">
            <div class="confidence-indicator">
              <span class="confidence-label">${confLabel}</span>
              <div class="confidence-bar">
                <div class="confidence-fill ${confClass}" style="width: ${maxConf * 100}%"></div>
              </div>
            </div>
            <span class="paper-evidence-count">${analysis.methods.reduce((s, m) => s + m.evidence.length, 0)} 条证据</span>
          </div>
        </div>
        ${linksHTML ? `<div class="paper-links">${linksHTML}</div>` : ''}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.paper-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.index);
      showDetail(filteredPapers[idx]);
    });
  });
}

function showDetail(paper) {
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');
  const analysis = paper._analysis;

  const title = paper['Document Title'] || '未知标题';
  const authors = paper['Authors'] || '';
  const year = paper['Publication Year'] || '';
  const abstract = paper['Abstract'] || '';
  const doi = paper['DOI'] || '';
  const pdfLink = paper['PDF Link'] || '';
  const authorKW = paper['Author Keywords'] || '';
  const ieeeTerms = paper['IEEE Terms'] || paper['Index Terms'] || '';
  const pubTitle = paper['Publication Title'] || '';
  const refCount = paper['Reference Count'] || '';
  const citCount = paper['Article Citation Count'] || '';

  let highlightedAbstract = escapeHTML(abstract);
  for (const m of analysis.methods) {
    for (const ev of m.evidence) {
      if (ev.source.includes('摘要')) {
        const regex = new RegExp(`(${escapeRegex(ev.term)})`, 'gi');
        highlightedAbstract = highlightedAbstract.replace(regex, '<span class="highlight-match">$1</span>');
      }
    }
  }

  const tagsHTML = analysis.methods.map(m =>
    `<span class="method-tag ${m.method.tagClass}">${m.method.label}</span>`
  ).join(' ');

  let linkTags = '';
  if (doi) {
    linkTags += `<a href="https://doi.org/${escapeHTML(doi)}" target="_blank" class="method-tag method-tag-default" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;"><i class="ri-external-link-line" style="font-size:10px"></i>DOI</a>`;
  }
  if (pdfLink) {
    linkTags += `<a href="${escapeHTML(pdfLink)}" target="_blank" class="method-tag method-tag-default" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;"><i class="ri-file-pdf-2-line" style="font-size:10px"></i>PDF</a>`;
  }

  const evidenceHTML = analysis.methods.map(m => `
    <div class="evidence-block">
      <div class="evidence-header">
        <span class="method-tag ${m.method.tagClass}">${m.method.label}</span>
        <span class="evidence-conf">置信度 ${(m.confidence * 100).toFixed(0)}%</span>
      </div>
      ${m.evidence.map(ev => `
        <div class="evidence-item">
          <span class="source">[${ev.source}]</span> 匹配: <span class="term">"${escapeHTML(ev.term)}"</span>
        </div>
      `).join('')}
    </div>
  `).join('');

  const keywordsHTML = authorKW
    ? authorKW.split(';').map(k => k.trim()).filter(Boolean).map(k =>
        `<span class="keyword-chip">${escapeHTML(k)}</span>`
      ).join('')
    : '';

  const ieeeHTML = ieeeTerms
    ? ieeeTerms.split(';').map(k => k.trim()).filter(Boolean).map(k =>
        `<span class="keyword-chip">${escapeHTML(k)}</span>`
      ).join('')
    : '';

  content.innerHTML = `
    <div class="detail-title">${escapeHTML(title)}</div>
    <div class="detail-authors">${escapeHTML(authors)}</div>
    ${pubTitle ? `<div class="detail-venue">${escapeHTML(pubTitle)}${year ? ' · ' + year : ''}</div>` : ''}

    <div class="detail-tags">
      ${tagsHTML}
      ${linkTags}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">摘要 Abstract</div>
      <div class="detail-abstract">${highlightedAbstract}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">研究方法识别证据</div>
      ${evidenceHTML}
    </div>

    ${keywordsHTML ? `
    <div class="detail-section">
      <div class="detail-section-title">作者关键词</div>
      <div class="detail-keywords">${keywordsHTML}</div>
    </div>` : ''}

    ${ieeeHTML ? `
    <div class="detail-section">
      <div class="detail-section-title">索引术语</div>
      <div class="detail-keywords">${ieeeHTML}</div>
    </div>` : ''}

    ${(citCount || refCount) ? `
    <div class="detail-stats">
      ${citCount ? `<div class="detail-stat-card"><div class="label">被引次数</div><div class="value">${citCount}</div></div>` : ''}
      ${refCount ? `<div class="detail-stat-card"><div class="label">参考文献数</div><div class="value">${refCount}</div></div>` : ''}
    </div>` : ''}
  `;

  modal.classList.remove('hidden');
}

// ========== 导出功能 ==========
function exportResults() {
  if (filteredPapers.length === 0) return;

  const discLabel = currentDiscipline ? currentDiscipline.label : '未知学科';
  const headers = ['标题', '作者', '年份', '研究方法标签', '置信度', 'DOI', 'PDF链接'];
  const rows = filteredPapers.map(p => {
    const tags = p._analysis.methods.map(m => m.method.label).join('; ');
    const maxConf = Math.max(...p._analysis.methods.map(m => m.confidence));
    return [
      `"${(p['Document Title'] || '').replace(/"/g, '""')}"`,
      `"${(p['Authors'] || '').replace(/"/g, '""')}"`,
      p['Publication Year'] || '',
      `"${tags}"`,
      (maxConf * 100).toFixed(0) + '%',
      p['DOI'] || '',
      p['PDF Link'] || ''
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${discLabel}论文筛选结果_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== 导出 HTML ==========
function exportHTML() {
  if (filteredPapers.length === 0) return;

  const discLabel = currentDiscipline ? currentDiscipline.label : '未知学科';
  const total = allPapers.length;
  const matched = allPapers.filter(p => p._analysis.isDesignMethod).length;
  const hitRate = total > 0 ? (matched / total * 100).toFixed(1) + '%' : '0%';
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toLocaleString('zh-CN');

  const papersHTML = filteredPapers.map((paper, idx) => {
    const analysis = paper._analysis;
    const title = paper['Document Title'] || '未知标题';
    const authors = paper['Authors'] || '未知作者';
    const year = paper['Publication Year'] || '';
    const abstract = paper['Abstract'] || '';
    const doi = paper['DOI'] || '';
    const pdfLink = paper['PDF Link'] || '';

    const tagsHTML = analysis.methods.map(m =>
      `<span class="method-tag ${m.method.tagClass}">${escapeHTML(m.method.label)}</span>`
    ).join('');

    const maxConf = Math.max(...analysis.methods.map(m => m.confidence));
    const confClass = maxConf >= 0.7 ? 'confidence-high' : maxConf >= 0.4 ? 'confidence-medium' : 'confidence-low';
    const confLabel = maxConf >= 0.7 ? '高置信度' : maxConf >= 0.4 ? '中置信度' : '低置信度';

    const shortAbstract = abstract.length > 300
      ? abstract.substring(0, 300) + '…'
      : abstract;

    const authorList = authors.split(';').map(a => a.trim()).filter(Boolean);
    const displayAuthors = authorList.length > 3
      ? authorList.slice(0, 3).join(', ') + ` 等 ${authorList.length} 人`
      : authorList.join(', ');

    let linksHTML = '';
    if (doi) {
      linksHTML += `<a href="https://doi.org/${escapeHTML(doi)}" target="_blank" class="paper-link-btn">DOI</a>`;
    }
    if (pdfLink) {
      linksHTML += `<a href="${escapeHTML(pdfLink)}" target="_blank" class="paper-link-btn">PDF</a>`;
    }

    return `
      <div class="paper-card">
        <div class="paper-index">${idx + 1}</div>
        <div class="paper-body">
          <div class="paper-title">${escapeHTML(title)}</div>
          <div class="paper-meta">${escapeHTML(displayAuthors)}${year ? ' · ' + year : ''}</div>
          <div class="paper-tags">${tagsHTML}</div>
          <div class="paper-abstract">${escapeHTML(shortAbstract)}</div>
          <div class="paper-footer">
            <div class="confidence-indicator">
              <span class="confidence-label">${confLabel}</span>
              <div class="confidence-bar">
                <div class="confidence-fill ${confClass}" style="width: ${maxConf * 100}%"></div>
              </div>
            </div>
            <span class="paper-evidence-count">${analysis.methods.reduce((s, m) => s + m.evidence.length, 0)} 条证据</span>
          </div>
        </div>
        ${linksHTML ? `<div class="paper-links">${linksHTML}</div>` : ''}
      </div>`;
  }).join('\n');

  // 方法标签统计
  const tagStats = {};
  filteredPapers.forEach(p => {
    p._analysis.methods.forEach(m => {
      tagStats[m.method.label] = (tagStats[m.method.label] || 0) + 1;
    });
  });
  const tagStatsHTML = Object.entries(tagStats)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `<span class="tag-btn">${label} <span class="count">${count}</span></span>`)
    .join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${discLabel}论文筛选结果 — ${dateStr}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --color-bg: #FAFAFA; --color-surface: #FFFFFF;
    --color-border: #E5E5E5; --color-border-light: #F0F0F0;
    --color-text-primary: #1D1D1F; --color-text-secondary: #6E6E73; --color-text-tertiary: #999;
    --color-accent: #0071E3; --color-green: #34C759; --color-orange: #FF9500;
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-serif: 'Noto Serif SC', 'Georgia', serif;
  }
  body { font-family: var(--font-sans); background: var(--color-bg); color: var(--color-text-primary); line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .container { max-width: 980px; margin: 0 auto; padding: 0 22px; }

  /* 报告头 */
  .report-header { text-align: center; padding: 60px 22px 40px; border-bottom: 1px solid var(--color-border-light); margin-bottom: 32px; }
  .report-header .eyebrow { font-size: 14px; font-weight: 500; color: var(--color-accent); letter-spacing: 0.04em; margin-bottom: 12px; }
  .report-header h1 { font-family: var(--font-serif); font-size: 36px; font-weight: 700; letter-spacing: -0.025em; margin-bottom: 16px; }
  .report-header .desc { font-size: 14px; color: var(--color-text-tertiary); }

  /* 统计栏 */
  .stats-bar { display: flex; align-items: center; justify-content: center; gap: 32px; padding: 20px; background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: 12px; margin-bottom: 24px; }
  .stat-item { display: flex; align-items: baseline; gap: 6px; }
  .stat-label { font-size: 12px; color: var(--color-text-tertiary); }
  .stat-value { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
  .stat-value-accent { color: var(--color-accent); }
  .stat-divider { width: 1px; height: 24px; background: var(--color-border); }

  /* 标签栏 */
  .tag-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; padding: 16px 20px; background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: 12px; }
  .tag-btn { padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid var(--color-border); background: transparent; color: var(--color-text-secondary); }
  .tag-btn .count { opacity: 0.5; margin-left: 4px; }

  /* 论文卡片 */
  .paper-list { display: flex; flex-direction: column; gap: 2px; margin-bottom: 40px; }
  .paper-card { display: flex; align-items: flex-start; gap: 20px; padding: 20px 24px; background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: 12px; }
  .paper-index { width: 32px; height: 32px; border-radius: 50%; background: var(--color-bg); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: var(--color-text-tertiary); flex-shrink: 0; margin-top: 2px; }
  .paper-body { flex: 1; min-width: 0; }
  .paper-title { font-family: var(--font-serif); font-size: 16px; font-weight: 600; line-height: 1.45; margin-bottom: 6px; }
  .paper-meta { font-size: 13px; color: var(--color-text-tertiary); margin-bottom: 10px; }
  .paper-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .paper-abstract { font-size: 13px; line-height: 1.65; color: var(--color-text-secondary); margin-bottom: 12px; }
  .paper-footer { display: flex; align-items: center; gap: 16px; }
  .paper-links { display: flex; gap: 6px; flex-shrink: 0; margin-top: 2px; }
  .paper-link-btn { padding: 4px 12px; border-radius: 8px; border: 1px solid var(--color-border); font-size: 12px; color: var(--color-text-tertiary); text-decoration: none; transition: all 0.2s; }
  .paper-link-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }

  /* 置信度 */
  .confidence-indicator { display: flex; align-items: center; gap: 8px; }
  .confidence-label { font-size: 11px; color: var(--color-text-tertiary); }
  .confidence-bar { width: 80px; height: 3px; background: var(--color-border-light); border-radius: 2px; overflow: hidden; }
  .confidence-fill { height: 100%; border-radius: 2px; }
  .confidence-high { background: var(--color-green); }
  .confidence-medium { background: var(--color-orange); }
  .confidence-low { background: #D1D1D6; }
  .paper-evidence-count { font-size: 11px; color: var(--color-text-tertiary); }

  /* 方法标签 8色 */
  .method-tag { display: inline-block; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 12px; white-space: nowrap; }
  .method-tag-0 { background: rgba(52,199,89,0.1); color: #1B7A32; }
  .method-tag-1 { background: rgba(255,149,0,0.1); color: #C93400; }
  .method-tag-2 { background: rgba(175,82,222,0.1); color: #8944AB; }
  .method-tag-3 { background: rgba(0,113,227,0.1); color: #0055AA; }
  .method-tag-4 { background: rgba(255,59,48,0.1); color: #D70015; }
  .method-tag-5 { background: rgba(90,200,250,0.1); color: #0A7ACA; }
  .method-tag-6 { background: rgba(255,100,130,0.1); color: #C44060; }
  .method-tag-7 { background: rgba(48,176,199,0.1); color: #1A8A9E; }

  /* 页脚 */
  .footer { text-align: center; padding: 32px; font-size: 13px; color: var(--color-text-tertiary); border-top: 1px solid var(--color-border-light); margin-top: 16px; }
  .footer a { color: #8A2BE2; text-decoration: none; }

  @media print {
    body { background: white; }
    .paper-card { break-inside: avoid; border: 1px solid #eee; }
  }
  @media (max-width: 768px) {
    .paper-card { flex-direction: column; gap: 12px; padding: 16px; }
    .paper-index { display: none; }
    .stats-bar { flex-wrap: wrap; gap: 16px; }
  }
</style>
</head>
<body>
<div class="report-header">
  <p class="eyebrow">${escapeHTML(discLabel)} · 论文筛选结果</p>
  <h1>研究方法匹配报告</h1>
  <p class="desc">生成时间: ${timeStr} · 共筛选 ${filteredPapers.length} 篇论文</p>
</div>

<div class="container">
  <div class="stats-bar">
    <div class="stat-item">
      <span class="stat-label">论文总数</span>
      <span class="stat-value">${total}</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <span class="stat-label">方法匹配</span>
      <span class="stat-value stat-value-accent">${matched}</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <span class="stat-label">命中率</span>
      <span class="stat-value">${hitRate}</span>
    </div>
  </div>

  <div class="tag-bar">
    ${tagStatsHTML}
  </div>

  <div class="paper-list">
    ${papersHTML}
  </div>
</div>

<div class="footer">
  <p>由 <a href="https://REDACTED/" target="_blank">Paper Tools</a> 生成</p>
</div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${discLabel}论文筛选结果_${dateStr}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== 工具函数 ==========
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========== 学科选择器 ==========
function renderDisciplineSelector() {
  const grid = document.getElementById('disciplineGrid');
  grid.innerHTML = DISCIPLINES.map(d => `
    <div class="discipline-card ${d.cssClass}" data-id="${d.id}">
      <div class="discipline-icon"><i class="${d.icon}"></i></div>
      <div class="discipline-info">
        <div class="discipline-name">${d.label}</div>
        <div class="discipline-desc">${d.description}</div>
      </div>
      <div class="discipline-check"><i class="ri-check-line"></i></div>
    </div>
  `).join('');

  grid.querySelectorAll('.discipline-card').forEach(card => {
    card.addEventListener('click', () => selectDiscipline(card.dataset.id));
  });
}

function selectDiscipline(id) {
  const disc = getDiscipline(id);
  if (!disc) return;

  currentDiscipline = disc;

  // 更新卡片选中态
  document.querySelectorAll('.discipline-card').forEach(c => c.classList.remove('selected'));
  const activeCard = document.querySelector(`.discipline-card[data-id="${id}"]`);
  if (activeCard) activeCard.classList.add('selected');

  // 更新选中提示
  document.getElementById('selectedName').textContent = disc.label;
  document.getElementById('selectedCount').textContent = disc.methods.length;
  document.getElementById('selectedHint').classList.add('visible');

  // 激活拖放区
  const dropZone = document.getElementById('dropZone');
  dropZone.classList.remove('disabled');
  document.getElementById('dropTitle').textContent = '拖放 CSV 文件至此处';
  document.getElementById('dropHint').textContent = `系统将使用「${disc.label}」方法库进行分析`;

  // 更新功能卡片文案
  document.getElementById('feat1Desc').textContent = `扫描论文摘要中的${disc.label}研究方法术语与描述模式`;
  document.getElementById('feat2Desc').textContent = `结合作者关键词与索引术语，交叉验证${disc.label}方法`;
  document.getElementById('feat3Desc').textContent = `自动标注${disc.description.replace('等', '')}等方法类型`;

  // 如果已有数据，用新学科重新分析
  if (allPapers.length > 0) {
    reanalyzeWithDiscipline();
  }
}

function reanalyzeWithDiscipline() {
  if (!currentDiscipline) return;

  allPapers.forEach(p => {
    p._analysis = analyzePaper(p, currentDiscipline);
  });
  window.allPapers = allPapers;

  allTags.clear();
  for (const p of allPapers) {
    if (p._analysis.isDesignMethod) {
      for (const m of p._analysis.methods) {
        allTags.set(m.method.id, (allTags.get(m.method.id) || 0) + 1);
      }
    }
  }

  activeFilters.clear();
  renderStats();
  renderTagFilters();
  applyFilters();
}

// ========== 初始化 ==========
function init() {
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  const searchInput = document.getElementById('searchInput');
  const exportBtn = document.getElementById('exportBtn');
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');
  const closeModal = document.getElementById('closeModal');
  const modalOverlay = document.getElementById('modalOverlay');

  // 渲染学科选择器
  renderDisciplineSelector();

  // 文件上传
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  });

  // 拖拽
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dropZone.classList.contains('disabled')) {
      dropZone.classList.add('drop-active');
    }
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-active');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drop-active');
    if (!currentDiscipline) {
      alert('请先选择学科方向');
      return;
    }
    if (e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  });

  // 搜索
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applyFilters(), 200);
  });

  // 导出
  exportBtn.addEventListener('click', exportResults);
  exportHtmlBtn.addEventListener('click', exportHTML);

  // 弹窗关闭
  closeModal.addEventListener('click', () => {
    document.getElementById('detailModal').classList.add('hidden');
  });
  modalOverlay.addEventListener('click', () => {
    document.getElementById('detailModal').classList.add('hidden');
  });

  // ESC关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('detailModal').classList.add('hidden');
    }
  });
}

function processFile(file) {
  if (!file.name.endsWith('.csv')) {
    alert('请上传 CSV 格式的文件');
    return;
  }

  if (!currentDiscipline) {
    alert('请先选择学科方向');
    return;
  }

  document.getElementById('uploadSection').classList.add('hidden');
  document.getElementById('loadingSection').classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = (e) => {
    setTimeout(() => {
      try {
        const papers = parseCSV(e.target.result);

        if (papers.length === 0) {
          alert('未能解析出有效数据，请检查CSV格式');
          document.getElementById('uploadSection').classList.remove('hidden');
          document.getElementById('loadingSection').classList.add('hidden');
          return;
        }

        allPapers = papers.map(p => {
          p._analysis = analyzePaper(p, currentDiscipline);
          return p;
        });

        window.allPapers = allPapers;

        allTags.clear();
        for (const p of allPapers) {
          if (p._analysis.isDesignMethod) {
            for (const m of p._analysis.methods) {
              allTags.set(m.method.id, (allTags.get(m.method.id) || 0) + 1);
            }
          }
        }

        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('filterSection').classList.remove('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');

        renderStats();
        renderTagFilters();
        applyFilters();

      } catch (err) {
        console.error('解析错误:', err);
        alert('解析文件时出错: ' + err.message);
        document.getElementById('uploadSection').classList.remove('hidden');
        document.getElementById('loadingSection').classList.add('hidden');
      }
    }, 500);
  };
  reader.readAsText(file, 'UTF-8');
}

// 启动
init();
