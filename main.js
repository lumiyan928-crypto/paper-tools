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
