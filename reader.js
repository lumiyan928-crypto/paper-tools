/**
 * 论文阅读模块 — PDF 解析 + 结构化摘要提取 + 阅读报告
 * 使用 PDF.js 提取文本，通过 NLP 模式匹配分析论文结构
 * 改造：全学科方法扫描，不限定单一学科
 */

import { DISCIPLINES, GENERAL_METHODS, getAllMethodsFlat, getTagClass } from './disciplines.js';

// ========== PDF.js 初始化 ==========
let pdfJsReady = false;

async function ensurePdfJs() {
  if (pdfJsReady) return;

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    pdfJsReady = true;
    return;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
  pdfJsReady = true;
}

// ========== 全局状态 ==========
const readerState = {
  papers: [],
};

// ========== PDF 文本提取 ==========
async function extractTextFromPDF(arrayBuffer) {
  await ensurePdfJs();
  const lib = window.pdfjsLib;
  if (!lib) throw new Error('PDF.js 加载失败');

  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pagesText = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    pagesText.push(strings.join(' '));
  }

  return { numPages, pagesText, fullText: pagesText.join('\n\n') };
}

// ========== 论文标题提取 ==========
function extractTitle(fullText, fileName) {
  const head = fullText.substring(0, 2000);
  const lines = head.split('\n').map(l => l.trim()).filter(l => l.length > 5);

  for (const line of lines.slice(0, 10)) {
    const clean = line.replace(/\s+/g, ' ').trim();
    if (clean.length > 15 && clean.length < 300 &&
        !clean.match(/^(abstract|introduction|keywords|copyright|ieee|doi|proceedings|vol\.|issn)/i) &&
        !clean.match(/^\d+$/) &&
        !clean.match(/university|department|@/i)) {
      return clean;
    }
  }

  return fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
}

// ========== 论文章节切分 ==========
function splitSections(fullText) {
  const sectionPatterns = [
    { name: 'abstract', pattern: /(?:^|\n)\s*(?:ABSTRACT|Abstract)\s*(?:\n|[.:\-])/i },
    { name: 'introduction', pattern: /(?:^|\n)\s*(?:I\.?\s*)?(?:INTRODUCTION|Introduction)\s*(?:\n|$)/i },
    { name: 'related_work', pattern: /(?:^|\n)\s*(?:II\.?\s*)?(?:RELATED\s+WORK|LITERATURE\s+REVIEW|Background)/i },
    { name: 'method', pattern: /(?:^|\n)\s*(?:III\.?\s*)?(?:METHOD(?:OLOGY|S)?|APPROACH|STUDY\s+DESIGN|RESEARCH\s+DESIGN|SYSTEM\s+DESIGN|DESIGN\s+PROCESS)/i },
    { name: 'results', pattern: /(?:^|\n)\s*(?:IV\.?\s*)?(?:RESULTS?|FINDINGS?|EVALUATION)/i },
    { name: 'discussion', pattern: /(?:^|\n)\s*(?:V\.?\s*)?(?:DISCUSSION|ANALYSIS)/i },
    { name: 'conclusion', pattern: /(?:^|\n)\s*(?:VI\.?\s*)?(?:CONCLUSION|CONCLUSIONS|CONCLUDING\s+REMARKS|SUMMARY\s+AND)/i },
    { name: 'references', pattern: /(?:^|\n)\s*(?:REFERENCES?|BIBLIOGRAPHY)\s*(?:\n|$)/i },
  ];

  const sections = {};
  const matches = [];

  for (const sec of sectionPatterns) {
    const m = fullText.match(sec.pattern);
    if (m) {
      matches.push({ name: sec.name, index: m.index });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : fullText.length;
    sections[matches[i].name] = fullText.substring(start, end).trim();
  }

  if (Object.keys(sections).length === 0) {
    const len = fullText.length;
    sections['introduction'] = fullText.substring(0, Math.floor(len * 0.3));
    sections['conclusion'] = fullText.substring(Math.floor(len * 0.8));
    sections['method'] = fullText.substring(Math.floor(len * 0.3), Math.floor(len * 0.6));
  }

  return sections;
}

// ========== 研究问题提取 ==========
function extractResearchQuestions(sections) {
  const sources = [
    sections['abstract'] || '',
    sections['introduction'] || ''
  ].join('\n');

  const questions = [];

  const rqPatterns = [
    /(?:research\s+question|RQ)\s*[:\-]?\s*([^\n.?]+\??)/gi,
    /(?:this\s+(?:paper|study|research|work)\s+(?:investigates?|explores?|examines?|addresses?|aims?\s+to|seeks?\s+to|focuses?\s+on))\s+([^.]+\.)/gi,
    /(?:the\s+(?:goal|aim|objective|purpose)\s+of\s+this\s+(?:paper|study|research|work)\s+is\s+to)\s+([^.]+\.)/gi,
    /(?:we\s+(?:investigate|explore|examine|address|aim\s+to|seek\s+to|propose|present|introduce))\s+([^.]+\.)/gi,
    /(?:how\s+(?:can|do|does|should|might|could)\s+[^?]+\?)/gi,
    /(?:what\s+(?:is|are|makes|factors?)\s+[^?]+\?)/gi,
  ];

  for (const pattern of rqPatterns) {
    let match;
    while ((match = pattern.exec(sources)) !== null) {
      const text = (match[1] || match[0]).trim();
      if (text.length > 20 && text.length < 500) {
        questions.push(text);
      }
    }
  }

  const unique = [];
  for (const q of questions) {
    const qLower = q.toLowerCase();
    if (!unique.some(u => u.toLowerCase().includes(qLower.substring(0, 30)) ||
        qLower.includes(u.toLowerCase().substring(0, 30)))) {
      unique.push(q);
    }
  }

  if (unique.length === 0) {
    const abstractText = sections['abstract'] || sections['introduction'] || '';
    const sentences = abstractText.match(/[^.!?]+[.!?]+/g) || [];
    for (const s of sentences.slice(0, 3)) {
      const trimmed = s.trim();
      if (trimmed.length > 30 && !trimmed.match(/^(abstract|keyword|copyright|in this)/i)) {
        unique.push(trimmed);
        if (unique.length >= 2) break;
      }
    }
  }

  return unique.slice(0, 4);
}

// ========== 研究方法分析（全学科扫描） ==========
function extractResearchMethods(sections, fullText) {
  const methodSection = sections['method'] || '';
  const abstractSection = sections['abstract'] || '';
  const allText = methodSection + '\n' + abstractSection + '\n' + (sections['introduction'] || '');

  const result = {
    disciplineMethods: [],  // { disciplineLabel, methodLabel }
    generalMethods: [],
    participants: null,
    participantPhases: [],
    studyType: null,
    dataCollection: [],
  };

  // 全学科方法扫描
  const allMethods = getAllMethodsFlat();
  const matchedDisciplines = new Map(); // disciplineLabel -> [methodLabel]

  for (const method of allMethods) {
    let matched = false;

    // 关键词匹配
    for (const kw of method.keywords) {
      if (fullText.toLowerCase().includes(kw)) {
        matched = true;
        break;
      }
    }

    // 正则模式匹配
    if (!matched && method.abstractPatterns) {
      for (const p of method.abstractPatterns) {
        if (p.test(fullText)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      result.disciplineMethods.push({
        disciplineId: method.disciplineId,
        disciplineLabel: method.disciplineLabel,
        methodLabel: method.label,
        methodLabelEn: method.labelEn,
      });

      if (!matchedDisciplines.has(method.disciplineLabel)) {
        matchedDisciplines.set(method.disciplineLabel, []);
      }
      matchedDisciplines.get(method.disciplineLabel).push(method.label);
    }
  }

  result.matchedDisciplines = matchedDisciplines;

  // 通用研究方法检测
  for (const gm of GENERAL_METHODS) {
    if (gm.pattern.test(allText)) {
      result.generalMethods.push(gm.label);
    }
  }

  // 被试数量提取（分阶段）
  const phasePatterns = [
    { pattern: /(?:study|experiment|phase|stage|round|session|part|step|pilot)\s*(\d*)\s*[:\-—,]?\s*(?:we\s+)?(?:recruited|enrolled|involved|included|had|with)?\s*(\d+)\s+(?:participants?|subjects?|users?|people|individuals?|volunteers?|older\s+adults?|children|students?|workers?|respondents?)/gi, type: 'phase' },
    { pattern: /(?:in\s+the\s+)?(first|second|third|fourth|1st|2nd|3rd|4th|initial|final|pilot|main|preliminary|follow[\-\s]?up)\s+(?:study|experiment|phase|stage|round|session|evaluation|interview|workshop|survey)[,]?\s+(?:we\s+)?(?:recruited|enrolled|involved|included|had|with)?\s*(\d+)\s+(?:participants?|subjects?|users?|people|individuals?|volunteers?|older\s+adults?|children|students?|workers?|respondents?)/gi, type: 'ordinal' },
    { pattern: /(?:recruited|enrolled|involved|included)\s+(\d+)\s+(?:participants?|subjects?|users?|people|individuals?|volunteers?|older\s+adults?|children|students?|workers?|respondents?)\s+(?:for|in|during|to)\s+(?:the\s+)?([^.,:;]{5,40})/gi, type: 'purpose' },
    { pattern: /\(?\s*N\s*=\s*(\d+)\s*\)?/g, type: 'N_equals' },
  ];

  const generalParticipantPatterns = [
    /(\d+)\s+participants?\b/gi,
    /(\d+)\s+subjects?\b/gi,
    /(\d+)\s+users?\s+(?:were|participated|recruited|took\s+part)/gi,
    /(?:recruited|enrolled|involved)\s+(\d+)\s+(?:participants?|subjects?|users?|people|individuals?|volunteers?)/gi,
    /(?:sample\s+(?:of|size)\s*[=:]?\s*)(\d+)/gi,
    /(\d+)\s+(?:older\s+adults?|children|students?|workers?|respondents?|patients?)\s+(?:were|participated|took\s+part|completed)/gi,
  ];

  const seenCounts = new Set();
  const phaseLabels = {
    'first': '第一阶段', 'second': '第二阶段', 'third': '第三阶段', 'fourth': '第四阶段',
    '1st': '第一阶段', '2nd': '第二阶段', '3rd': '第三阶段', '4th': '第四阶段',
    'initial': '初始阶段', 'final': '最终阶段', 'pilot': '预实验', 'main': '正式实验',
    'preliminary': '初步研究', 'follow-up': '后续研究', 'followup': '后续研究',
  };

  for (const { pattern, type } of phasePatterns) {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      let phase = '', count = 0;
      if (type === 'phase') {
        const phaseNum = match[1] || '';
        count = parseInt(match[2]);
        phase = phaseNum ? `阶段 ${phaseNum}` : '';
      } else if (type === 'ordinal') {
        const ordinalKey = match[1].toLowerCase().replace(/\s+/g, '');
        count = parseInt(match[2]);
        phase = phaseLabels[ordinalKey] || match[1];
      } else if (type === 'purpose') {
        count = parseInt(match[1]);
        phase = translateToChineseSimple(match[2].trim());
      } else if (type === 'N_equals') {
        count = parseInt(match[1]);
        phase = '';
      }
      if (count >= 2 && count <= 10000 && !seenCounts.has(count)) {
        seenCounts.add(count);
        if (!phase) {
          const contextStart = Math.max(0, match.index - 100);
          const contextEnd = Math.min(fullText.length, match.index + match[0].length + 100);
          const context = fullText.substring(contextStart, contextEnd);
          const stageMatch = context.match(/(?:study|experiment|phase|stage|round|session|evaluation)\s*(\d+)/i);
          if (stageMatch) {
            phase = `阶段 ${stageMatch[1]}`;
          }
        }
        result.participantPhases.push({ phase: phase || '', count, context: match[0].trim() });
      }
    }
  }

  if (result.participantPhases.length === 0) {
    for (const pp of generalParticipantPatterns) {
      let match;
      while ((match = pp.exec(fullText)) !== null) {
        const num = parseInt(match[1]);
        if (num >= 2 && num <= 10000 && !seenCounts.has(num)) {
          seenCounts.add(num);
          result.participantPhases.push({ phase: '', count: num, context: match[0].trim() });
        }
      }
    }
  }

  result.participantPhases.sort((a, b) => {
    if (a.phase && b.phase) return a.phase.localeCompare(b.phase);
    return a.count - b.count;
  });
  result.participantPhases = result.participantPhases.slice(0, 6);

  if (result.participantPhases.length > 0) {
    result.participants = result.participantPhases.reduce((max, p) => Math.max(max, p.count), 0);
  }

  // 研究类型
  if (/qualitative/i.test(allText)) result.studyType = '定性研究';
  else if (/quantitative/i.test(allText)) result.studyType = '定量研究';
  else if (/mixed[\-\s]?method/i.test(allText)) result.studyType = '混合方法';
  else if (result.generalMethods.some(m => ['访谈', '主题分析', '扎根理论', '民族志'].includes(m))) result.studyType = '定性研究';
  else if (result.generalMethods.some(m => ['对照实验', '问卷调查', 'A/B测试'].includes(m))) result.studyType = '定量研究';

  // 数据收集方法
  if (/(?:audio|video)\s+record/i.test(allText)) result.dataCollection.push('录音/录像');
  if (/(?:think[\-\s]?aloud|thinking\s+aloud)/i.test(allText)) result.dataCollection.push('出声思维');
  if (/(?:screen\s+record|eye[\-\s]?track)/i.test(allText)) result.dataCollection.push('屏幕/眼动记录');
  if (/(?:observation|observ(?:ed|ing))/i.test(allText)) result.dataCollection.push('观察法');
  if (/(?:diary\s+stud|diary\s+method|experience\s+sampling)/i.test(allText)) result.dataCollection.push('日记法');

  return result;
}

// ========== 研究结论提取 ==========
function extractConclusions(sections) {
  const conclusionText = sections['conclusion'] || sections['discussion'] || '';
  const abstractText = sections['abstract'] || '';
  const conclusions = [];

  const conclusionPatterns = [
    /(?:our\s+(?:results?|findings?|study|work)\s+(?:show|demonstrate|indicate|suggest|reveal|confirm)s?\s+that)\s+([^.]+\.)/gi,
    /(?:we\s+(?:found|demonstrated?|showed?|observed?|conclude|confirmed?)\s+that)\s+([^.]+\.)/gi,
    /(?:the\s+results?\s+(?:show|demonstrate|indicate|suggest|reveal)s?\s+that)\s+([^.]+\.)/gi,
    /(?:this\s+(?:paper|study|research|work)\s+(?:shows?|demonstrates?|contributes?))\s+([^.]+\.)/gi,
    /(?:in\s+conclusion|to\s+conclude|in\s+summary),?\s+([^.]+\.)/gi,
  ];

  const source = conclusionText || abstractText;
  for (const pattern of conclusionPatterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const text = (match[1] || match[0]).trim();
      if (text.length > 25 && text.length < 500) {
        conclusions.push(text);
      }
    }
  }

  const unique = [];
  for (const c of conclusions) {
    const cLower = c.toLowerCase();
    if (!unique.some(u => u.toLowerCase().includes(cLower.substring(0, 40)))) {
      unique.push(c);
    }
  }

  if (unique.length === 0 && conclusionText) {
    const sentences = conclusionText.match(/[^.!?]+[.!?]+/g) || [];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (trimmed.length > 30 &&
          !trimmed.match(/^(VI|VII|VIII|conclusion|summary|references?|\d+\.)/i)) {
        unique.push(trimmed);
        if (unique.length >= 3) break;
      }
    }
  }

  return unique.slice(0, 5);
}

// ========== 创新点提取 ==========
function extractInnovations(sections, fullText) {
  const sources = [
    sections['abstract'] || '',
    sections['introduction'] || '',
    sections['conclusion'] || ''
  ].join('\n');

  const innovations = [];

  const innovationPatterns = [
    /(?:our\s+(?:main|key|primary|novel)?\s*contribution(?:s)?\s+(?:is|are|include))\s+([^.]+\.)/gi,
    /(?:we\s+(?:propose|present|introduce|develop|design|create)\s+(?:a\s+)?(?:novel|new|unique|innovative)?)\s+([^.]+\.)/gi,
    /(?:the\s+(?:main|key|primary|novel)\s+contribution(?:s)?\s+of\s+this\s+(?:paper|study|work)\s+(?:is|are))\s+([^.]+\.)/gi,
    /(?:to\s+the\s+best\s+of\s+our\s+knowledge[,]?)\s+([^.]+\.)/gi,
    /(?:unlike\s+(?:previous|prior|existing)\s+(?:work|studies?|approaches?|methods?)[,]?)\s+([^.]+\.)/gi,
    /(?:for\s+the\s+first\s+time[,]?)\s+([^.]+\.)/gi,
    /(?:novel(?:ly)?|innovative|first[\-\s]of[\-\s]its[\-\s]kind)\s+([^.]+\.)/gi,
  ];

  for (const pattern of innovationPatterns) {
    let match;
    while ((match = pattern.exec(sources)) !== null) {
      const text = (match[1] || match[0]).trim();
      if (text.length > 20 && text.length < 500) {
        innovations.push(text);
      }
    }
  }

  const unique = [];
  for (const i of innovations) {
    const iLower = i.toLowerCase();
    if (!unique.some(u => u.toLowerCase().includes(iLower.substring(0, 35)))) {
      unique.push(i);
    }
  }

  if (unique.length === 0) {
    const introText = sections['introduction'] || '';
    const sentences = introText.match(/[^.!?]+[.!?]+/g) || [];
    for (const s of sentences) {
      const trimmed = s.trim().toLowerCase();
      if ((trimmed.includes('novel') || trimmed.includes('contribut') ||
           trimmed.includes('propos') || trimmed.includes('first')) &&
          s.trim().length > 30) {
        unique.push(s.trim());
        if (unique.length >= 2) break;
      }
    }
  }

  return unique.slice(0, 4);
}

// ========== 简易英译中翻译 ==========
function translateToChineseSimple(text) {
  if (!text || typeof text !== 'string') return text;
  if (/[\u4e00-\u9fff]/.test(text)) return text;

  const dict = [
    ['in this paper', '在本文中'], ['in this study', '在本研究中'], ['in this work', '在本工作中'],
    ['in addition', '此外'], ['in particular', '特别是'], ['in contrast', '相比之下'],
    ['in order to', '为了'], ['on the other hand', '另一方面'],
    ['as a result', '因此'], ['as well as', '以及'], ['due to', '由于'],
    ['based on', '基于'], ['according to', '根据'], ['such as', '例如'],
    ['for example', '例如'], ['rather than', '而非'],
    ['however', '然而'], ['therefore', '因此'], ['furthermore', '此外'],
    ['moreover', '此外'], ['although', '虽然'], ['nevertheless', '尽管如此'],
    ['meanwhile', '同时'], ['subsequently', '随后'], ['consequently', '因此'],
    ['specifically', '具体而言'], ['additionally', '此外'], ['respectively', '分别'],
    ['significantly', '显著地'], ['approximately', '大约'], ['particularly', '特别是'],
    ['overall', '总体而言'], ['finally', '最后'], ['ultimately', '最终'],

    ['we propose', '我们提出'], ['we present', '我们展示'], ['we introduce', '我们引入'],
    ['we develop', '我们开发'], ['we design', '我们设计'], ['we implement', '我们实现'],
    ['we evaluate', '我们评估'], ['we investigate', '我们研究'], ['we explore', '我们探索'],
    ['we examine', '我们考察'], ['we analyze', '我们分析'], ['we demonstrate', '我们展示'],
    ['we conduct', '我们进行'], ['we find that', '我们发现'], ['we found that', '我们发现'],
    ['we show that', '我们表明'], ['we showed that', '我们表明'],
    ['we observe that', '我们观察到'], ['we conclude that', '我们得出结论'],
    ['our results show', '我们的结果表明'], ['our findings suggest', '我们的发现表明'],
    ['our study demonstrates', '我们的研究表明'],
    ['the results show', '结果表明'], ['the results indicate', '结果表明'],
    ['the findings show', '研究发现表明'], ['the findings suggest', '研究发现表明'],
    ['this paper presents', '本文展示了'], ['this paper proposes', '本文提出了'],
    ['this study investigates', '本研究调查了'], ['this study examines', '本研究考察了'],

    ['participatory design', '参与式设计'], ['co-design', '共同设计'],
    ['user-centered design', '用户中心设计'], ['human-centered design', '以人为中心设计'],
    ['design thinking', '设计思维'], ['speculative design', '思辨设计'],
    ['design fiction', '设计虚构'], ['design workshop', '设计工作坊'],
    ['focus group', '焦点小组'], ['wizard of oz', '绿野仙踪方法'],
    ['user study', '用户研究'], ['user experience', '用户体验'],
    ['human-computer interaction', '人机交互'], ['human-robot interaction', '人机器人交互'],
    ['machine learning', '机器学习'], ['deep learning', '深度学习'],
    ['neural network', '神经网络'], ['reinforcement learning', '强化学习'],
    ['natural language processing', '自然语言处理'], ['computer vision', '计算机视觉'],
    ['artificial intelligence', '人工智能'], ['virtual reality', '虚拟现实'],
    ['augmented reality', '增强现实'],
    ['randomized controlled trial', '随机对照试验'], ['meta-analysis', 'Meta分析'],
    ['systematic review', '系统综述'], ['cohort study', '队列研究'],
    ['case-control study', '病例对照研究'], ['cross-sectional', '横断面'],
    ['grounded theory', '扎根理论'], ['ethnography', '民族志'],
    ['discourse analysis', '话语分析'], ['content analysis', '内容分析'],
    ['action research', '行动研究'], ['design-based research', '设计研究'],
    ['thematic analysis', '主题分析'], ['longitudinal study', '纵向研究'],
    ['eye tracking', '眼动追踪'], ['neuroimaging', '脑成像'],
    ['participants', '参与者'], ['questionnaire', '问卷'], ['interview', '访谈'],
    ['prototype', '原型'], ['framework', '框架'], ['algorithm', '算法'],
    ['dataset', '数据集'], ['benchmark', '基准测试'], ['evaluation', '评估'],
    ['experiment', '实验'], ['simulation', '仿真'], ['hypothesis', '假设'],
    ['methodology', '方法论'], ['contribution', '贡献'], ['limitation', '局限性'],
    ['significance', '意义'], ['effectiveness', '有效性'], ['performance', '性能'],
    ['accuracy', '准确率'], ['usability', '可用性'], ['feasibility', '可行性'],
    ['novel', '新颖的'], ['robust', '鲁棒的'], ['innovative', '创新的'],
    ['research', '研究'], ['study', '研究'], ['approach', '方法'],
    ['method', '方法'], ['system', '系统'], ['model', '模型'], ['design', '设计'],
    ['analysis', '分析'], ['results', '结果'], ['data', '数据'], ['users', '用户'],
    ['children', '儿童'], ['older adults', '老年人'], ['students', '学生'],
    ['patients', '患者'], ['people', '人们'],
  ];

  let result = text;
  const sortedDict = [...dict].sort((a, b) => b[0].length - a[0].length);
  for (const [en, zh] of sortedDict) {
    const regex = new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, zh);
  }

  return result;
}

function translateArray(arr) {
  return arr.map(item => translateToChineseSimple(item));
}

// ========== 综合分析入口 ==========
function analyzePaperFullText(fullText, fileName) {
  const title = extractTitle(fullText, fileName);
  const sections = splitSections(fullText);
  const researchQuestions = extractResearchQuestions(sections);
  const methods = extractResearchMethods(sections, fullText);
  const conclusions = extractConclusions(sections);
  const innovations = extractInnovations(sections, fullText);

  return {
    title,
    sections: Object.keys(sections),
    researchQuestions: translateArray(researchQuestions),
    methods,
    conclusions: translateArray(conclusions),
    innovations: translateArray(innovations),
  };
}

// ========== 报告卡片渲染 ==========
function escapeHTMLReader(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderReportCard(paper, index) {
  const { fileName, analysis, status, numPages, error, pdfUrl } = paper;

  let statusHTML = '';
  if (status === 'processing') {
    statusHTML = '<span class="report-card-status status-processing"><i class="ri-loader-4-line"></i> 解析中</span>';
  } else if (status === 'done') {
    statusHTML = '<span class="report-card-status status-done"><i class="ri-check-line"></i> 完成</span>';
  } else if (status === 'error') {
    statusHTML = '<span class="report-card-status status-error"><i class="ri-error-warning-line"></i> 失败</span>';
  }

  const title = analysis ? escapeHTMLReader(analysis.title) : escapeHTMLReader(fileName);

  let bodyHTML = '';

  if (status === 'processing') {
    bodyHTML = `
      <div class="report-skeleton">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>`;
  } else if (status === 'error') {
    bodyHTML = `
      <div class="report-card-body">
        <div class="report-section">
          <div class="report-section-content" style="color: var(--color-red);">
            解析失败: ${escapeHTMLReader(error || '未知错误')}
          </div>
        </div>
      </div>`;
  } else if (analysis) {
    const rqHTML = analysis.researchQuestions.length > 0
      ? analysis.researchQuestions.map(q => `<p>• ${escapeHTMLReader(q)}</p>`).join('')
      : '<p style="color:var(--color-text-tertiary)">未能自动识别，建议手动查看论文引言部分</p>';

    const m = analysis.methods;
    const allMethods = [...m.disciplineMethods.map(d => d.methodLabel), ...m.generalMethods];
    const uniqueAllMethods = [...new Set(allMethods)];
    const methodListHTML = uniqueAllMethods.length > 0
      ? uniqueAllMethods.map(method => `<p>• ${escapeHTMLReader(method)}</p>`).join('')
      : '<p style="color:var(--color-text-tertiary)">未能自动识别具体方法</p>';

    // 学科方法标签（带学科前缀）
    const disciplineTagsHTML = m.disciplineMethods.length > 0
      ? m.disciplineMethods.map((d, i) =>
          `<span class="method-tag ${getTagClass(i)}">${escapeHTMLReader(d.disciplineLabel)} · ${escapeHTMLReader(d.methodLabel)}</span>`
        ).join('')
      : '';

    // 方法详情网格
    const matchedDiscCount = m.matchedDisciplines ? m.matchedDisciplines.size : 0;
    let methodGridHTML = '<div class="method-detail-grid">';
    methodGridHTML += `<div class="method-detail-item">
      <div class="label">学科方法</div>
      <div class="value">${matchedDiscCount > 0
        ? `<span class="discipline-tag discipline-tag-yes">✓ 匹配 ${matchedDiscCount} 个学科</span>`
        : '<span class="discipline-tag discipline-tag-no">— 未识别</span>'
      }</div>
    </div>`;
    methodGridHTML += `<div class="method-detail-item">
      <div class="label">被试数量</div>
      <div class="value">${m.participantPhases && m.participantPhases.length > 0
        ? m.participantPhases.map(p => {
            const phaseLabel = p.phase ? `<span style="color:var(--color-text-tertiary);font-weight:400;font-size:12px">${escapeHTMLReader(p.phase)}:</span> ` : '';
            return phaseLabel + p.count + ' 人';
          }).join('<br>')
        : '未提及'
      }</div>
    </div>`;
    methodGridHTML += `<div class="method-detail-item">
      <div class="label">研究类型</div>
      <div class="value">${m.studyType || '未明确'}</div>
    </div>`;
    if (m.dataCollection.length > 0) {
      methodGridHTML += `<div class="method-detail-item">
        <div class="label">数据收集</div>
        <div class="value">${m.dataCollection.join('、')}</div>
      </div>`;
    }
    methodGridHTML += '</div>';

    const conclusionHTML = analysis.conclusions.length > 0
      ? analysis.conclusions.map(c => `<p>• ${escapeHTMLReader(c)}</p>`).join('')
      : '<p style="color:var(--color-text-tertiary)">未能自动提取，建议查看论文结论章节</p>';

    const innovationHTML = analysis.innovations.length > 0
      ? analysis.innovations.map(i => `<p>• ${escapeHTMLReader(i)}</p>`).join('')
      : '<p style="color:var(--color-text-tertiary)">未能自动识别，建议查看论文引言/结论部分</p>';

    bodyHTML = `
      <div class="report-card-body">
        <div class="report-section">
          <div class="report-section-header">
            <div class="report-section-icon icon-question"><i class="ri-questionnaire-line"></i></div>
            <div class="report-section-title">研究问题 Research Questions</div>
          </div>
          <div class="report-section-content">${rqHTML}</div>
        </div>

        <div class="report-section">
          <div class="report-section-header">
            <div class="report-section-icon icon-method"><i class="ri-flask-line"></i></div>
            <div class="report-section-title">研究方法 Methods</div>
          </div>
          <div class="report-section-content">${methodListHTML}</div>
          ${disciplineTagsHTML ? `<div class="report-method-tags">${disciplineTagsHTML}</div>` : ''}
          ${methodGridHTML}
        </div>

        <div class="report-section">
          <div class="report-section-header">
            <div class="report-section-icon icon-conclusion"><i class="ri-check-double-line"></i></div>
            <div class="report-section-title">研究结论 Conclusions</div>
          </div>
          <div class="report-section-content">${conclusionHTML}</div>
        </div>

        <div class="report-section">
          <div class="report-section-header">
            <div class="report-section-icon icon-innovation"><i class="ri-lightbulb-flash-line"></i></div>
            <div class="report-section-title">研究创新点 Innovations</div>
          </div>
          <div class="report-section-content">${innovationHTML}</div>
        </div>
      </div>`;
  }

  const metaItems = [];
  if (numPages) metaItems.push(`<span class="report-card-meta-item"><i class="ri-pages-line"></i> ${numPages} 页</span>`);
  metaItems.push(`<span class="report-card-meta-item"><i class="ri-file-pdf-2-line"></i> ${escapeHTMLReader(fileName)}</span>`);

  return `
    <div class="report-card" data-index="${index}">
      <div class="report-card-header">
        <div class="report-card-number">${index + 1}</div>
        <div class="report-card-title-area">
          <div class="report-card-title">${title}</div>
          <div class="report-card-meta">${metaItems.join('')}</div>
        </div>
        <div class="report-card-actions">
          ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" rel="noopener" class="report-pdf-link" title="查看原文 PDF" onclick="event.stopPropagation()"><i class="ri-file-pdf-2-line"></i> 查看原文</a>` : ''}
          ${statusHTML}
        </div>
      </div>
      ${bodyHTML}
      ${status === 'done' ? `
        <button class="report-card-toggle" data-toggle="${index}">
          <span>收起详情</span>
          <i class="ri-arrow-up-s-line"></i>
        </button>
      ` : ''}
    </div>
  `;
}

function renderAllReports() {
  const container = document.getElementById('readerReportList');
  if (!container) return;

  container.innerHTML = readerState.papers.map((p, i) => renderReportCard(p, i)).join('');

  const countEl = document.getElementById('readerPaperCount');
  if (countEl) {
    countEl.textContent = readerState.papers.filter(p => p.status === 'done').length;
  }

  container.querySelectorAll('.report-card-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.report-card');
      const isCollapsed = card.classList.toggle('collapsed');
      btn.querySelector('span').textContent = isCollapsed ? '展开详情' : '收起详情';
    });
  });
}

// ========== 处理PDF文件 ==========
async function processPDFFiles(files) {
  const uploadSection = document.getElementById('readerUploadSection');
  const loadingSection = document.getElementById('readerLoadingSection');
  const resultsSection = document.getElementById('readerResultsSection');
  const progressFill = document.getElementById('readerProgressFill');
  const progressText = document.getElementById('readerProgressText');

  if (readerState.papers.length === 0) {
    uploadSection.classList.add('hidden');
  }
  loadingSection.classList.remove('hidden');

  const startIdx = readerState.papers.length;
  const totalNew = files.length;

  for (const file of files) {
    const pdfBlobUrl = URL.createObjectURL(file);
    readerState.papers.push({
      fileName: file.name,
      title: file.name.replace(/\.pdf$/i, ''),
      numPages: 0,
      fullText: '',
      analysis: null,
      status: 'processing',
      error: null,
      pdfUrl: pdfBlobUrl,
    });
  }

  resultsSection.classList.remove('hidden');
  renderAllReports();

  for (let i = 0; i < totalNew; i++) {
    const fileIndex = startIdx + i;
    const file = files[i];
    const progress = Math.round(((i) / totalNew) * 100);
    progressFill.style.width = progress + '%';
    progressText.textContent = `正在解析第 ${i + 1}/${totalNew} 篇: ${file.name}`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { numPages, fullText } = await extractTextFromPDF(arrayBuffer);
      const analysis = analyzePaperFullText(fullText, file.name);

      readerState.papers[fileIndex] = {
        ...readerState.papers[fileIndex],
        numPages,
        fullText,
        analysis,
        status: 'done',
      };
    } catch (err) {
      console.error(`解析 ${file.name} 失败:`, err);
      readerState.papers[fileIndex] = {
        ...readerState.papers[fileIndex],
        status: 'error',
        error: err.message,
      };
    }

    renderAllReports();
  }

  progressFill.style.width = '100%';
  progressText.textContent = `全部解析完成！共 ${totalNew} 篇`;

  setTimeout(() => {
    loadingSection.classList.add('hidden');
  }, 800);
}

// ========== 下载HTML阅读报告 ==========
function downloadHTMLReport() {
  const donePapers = readerState.papers.filter(p => p.status === 'done' && p.analysis);
  if (donePapers.length === 0) {
    alert('暂无已完成的论文报告');
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleString('zh-CN');

  let papersHTML = '';
  donePapers.forEach((paper, idx) => {
    const a = paper.analysis;
    const m = a.methods;
    const allMethods = [...m.disciplineMethods.map(d => d.methodLabel), ...m.generalMethods];
    const uniqueMethods = [...new Set(allMethods)];

    // 学科方法汇总
    const discMethodSummary = m.disciplineMethods.length > 0
      ? m.disciplineMethods.map(d => `${d.disciplineLabel}·${d.methodLabel}`).join('、')
      : '未识别';

    papersHTML += `
    <div class="paper-report">
      <div class="paper-header">
        <span class="paper-num">${idx + 1}</span>
        <div>
          <h2>${escapeHTMLReader(a.title)}</h2>
          <p class="paper-file">${escapeHTMLReader(paper.fileName)} · ${paper.numPages} 页</p>
        </div>
      </div>

      <div class="section">
        <h3>📋 研究问题</h3>
        ${a.researchQuestions.length > 0
          ? '<ul>' + a.researchQuestions.map(q => `<li>${escapeHTMLReader(q)}</li>`).join('') + '</ul>'
          : '<p class="empty">未能自动识别</p>'
        }
      </div>

      <div class="section">
        <h3>🔬 研究方法</h3>
        <div class="method-info">
          <div class="method-row">
            <span class="label">学科方法：</span>
            <span class="value">${m.disciplineMethods.length > 0 ? '✅ ' + discMethodSummary : '❌ 未识别到特定学科方法'}</span>
          </div>
          <div class="method-row">
            <span class="label">被试数量：</span>
            <span class="value">${m.participantPhases && m.participantPhases.length > 0
              ? m.participantPhases.map(p => (p.phase ? p.phase + ': ' : '') + p.count + ' 人').join('；')
              : '未提及'
            }</span>
          </div>
          <div class="method-row">
            <span class="label">研究类型：</span>
            <span class="value">${m.studyType || '未明确'}</span>
          </div>
          ${m.dataCollection.length > 0 ? `
          <div class="method-row">
            <span class="label">数据收集：</span>
            <span class="value">${m.dataCollection.join('、')}</span>
          </div>` : ''}
          <div class="method-row">
            <span class="label">使用方法：</span>
            <span class="value">${uniqueMethods.length > 0 ? uniqueMethods.join('、') : '未识别'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>📌 研究结论</h3>
        ${a.conclusions.length > 0
          ? '<ul>' + a.conclusions.map(c => `<li>${escapeHTMLReader(c)}</li>`).join('') + '</ul>'
          : '<p class="empty">未能自动提取</p>'
        }
      </div>

      <div class="section">
        <h3>💡 研究创新点</h3>
        ${a.innovations.length > 0
          ? '<ul>' + a.innovations.map(i => `<li>${escapeHTMLReader(i)}</li>`).join('') + '</ul>'
          : '<p class="empty">未能自动识别</p>'
        }
      </div>
    </div>
    `;
  });

  // 统计
  const discMatchCount = donePapers.filter(p => p.analysis.methods.disciplineMethods.length > 0).length;
  const avgParticipants = donePapers
    .filter(p => p.analysis.methods.participantPhases && p.analysis.methods.participantPhases.length > 0)
    .map(p => p.analysis.methods.participantPhases.reduce((max, ph) => Math.max(max, ph.count), 0));
  const avgP = avgParticipants.length > 0
    ? Math.round(avgParticipants.reduce((a, b) => a + b, 0) / avgParticipants.length)
    : null;

  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>论文阅读报告 — ${dateStr}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #FAFAFA; color: #1D1D1F; line-height: 1.65; padding: 40px 20px;
  }
  .container { max-width: 860px; margin: 0 auto; }
  .report-header { text-align: center; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid #E5E5E5; }
  .report-header h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; }
  .report-header .meta { font-size: 14px; color: #6E6E73; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 40px; }
  .summary-card { background: white; border: 1px solid #F0F0F0; border-radius: 12px; padding: 20px; text-align: center; }
  .summary-card .num { font-size: 28px; font-weight: 700; color: #0071E3; }
  .summary-card .label { font-size: 12px; color: #999; margin-top: 4px; }
  .paper-report { background: white; border: 1px solid #F0F0F0; border-radius: 16px; margin-bottom: 24px; overflow: hidden; }
  .paper-header { display: flex; align-items: center; gap: 16px; padding: 24px 28px; border-bottom: 1px solid #F0F0F0; }
  .paper-num { width: 36px; height: 36px; border-radius: 10px; background: rgba(0,113,227,0.06); color: #0071E3; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
  .paper-header h2 { font-size: 17px; font-weight: 700; line-height: 1.4; }
  .paper-file { font-size: 12px; color: #999; margin-top: 4px; }
  .section { padding: 20px 28px; border-bottom: 1px solid #F0F0F0; }
  .section:last-child { border-bottom: none; }
  .section h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
  .section ul { padding-left: 20px; }
  .section li { font-size: 14px; color: #6E6E73; margin-bottom: 6px; line-height: 1.7; }
  .section p { font-size: 14px; color: #6E6E73; }
  .empty { color: #999; font-style: italic; }
  .method-info { background: #FAFAFA; border-radius: 10px; padding: 16px 20px; }
  .method-row { display: flex; gap: 8px; padding: 4px 0; font-size: 14px; }
  .method-row .label { color: #999; flex-shrink: 0; font-weight: 500; }
  .method-row .value { color: #1D1D1F; }
  .footer { text-align: center; padding: 32px; font-size: 13px; color: #999; border-top: 1px solid #F0F0F0; margin-top: 24px; }
  .footer a { color: #8A2BE2; text-decoration: none; }
  @media print { body { background: white; padding: 20px; } .paper-report { break-inside: avoid; } }
</style>
</head>
<body>
<div class="container">
  <div class="report-header">
    <h1>📄 论文阅读报告</h1>
    <p class="meta">生成时间: ${timeStr} · 共 ${donePapers.length} 篇论文</p>
  </div>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="num">${donePapers.length}</div>
      <div class="label">论文总数</div>
    </div>
    <div class="summary-card">
      <div class="num">${discMatchCount}</div>
      <div class="label">学科方法匹配</div>
    </div>
    <div class="summary-card">
      <div class="num">${avgP !== null ? avgP : '—'}</div>
      <div class="label">平均被试数量</div>
    </div>
  </div>
  ${papersHTML}
  <div class="footer">
    <p>由 <a href="https://REDACTED/" target="_blank">With</a> 通过自然语言生成</p>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `论文阅读报告_${dateStr}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== 初始化阅读器 ==========
function initReader() {
  const pdfFileInput = document.getElementById('pdfFileInput');
  const pdfDropZone = document.getElementById('pdfDropZone');
  const downloadBtn = document.getElementById('downloadReportBtn');
  const addMoreInput = document.getElementById('addMorePdfInput');

  if (!pdfFileInput || !pdfDropZone) return;

  pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processPDFFiles(Array.from(e.target.files));
      pdfFileInput.value = '';
    }
  });

  pdfDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    pdfDropZone.classList.add('drop-active');
  });
  pdfDropZone.addEventListener('dragleave', () => {
    pdfDropZone.classList.remove('drop-active');
  });
  pdfDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    pdfDropZone.classList.remove('drop-active');
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length > 0) {
      processPDFFiles(files);
    } else {
      alert('请上传 PDF 格式的文件');
    }
  });

  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadHTMLReport);
  }

  if (addMoreInput) {
    addMoreInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        processPDFFiles(Array.from(e.target.files));
        addMoreInput.value = '';
      }
    });
  }
}

// ========== Tab切换逻辑 ==========
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const filterPage = document.getElementById('filterPage');
  const readerPage = document.getElementById('readerPage');
  const statsBar = document.getElementById('statsBar');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (target === 'filter') {
        filterPage.classList.add('active');
        readerPage.classList.remove('active');
        if (window.allPapers && window.allPapers.length > 0) {
          statsBar.classList.remove('hidden');
        }
      } else if (target === 'reader') {
        readerPage.classList.add('active');
        filterPage.classList.remove('active');
        statsBar.classList.add('hidden');
      }
    });
  });
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initReader();
});
