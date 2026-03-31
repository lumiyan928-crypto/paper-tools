/**
 * 多学科研究方法知识库
 * 每个学科包含 6-12 种研究方法，每种方法带关键词和正则模式
 */

// ========== 8色标签循环系统 ==========
export const TAG_COLORS = [
  { cls: 'method-tag-0', color: '#1B7A32', bg: 'rgba(52,199,89,0.1)' },
  { cls: 'method-tag-1', color: '#C93400', bg: 'rgba(255,149,0,0.1)' },
  { cls: 'method-tag-2', color: '#8944AB', bg: 'rgba(175,82,222,0.1)' },
  { cls: 'method-tag-3', color: '#0055AA', bg: 'rgba(0,113,227,0.1)' },
  { cls: 'method-tag-4', color: '#D70015', bg: 'rgba(255,59,48,0.1)' },
  { cls: 'method-tag-5', color: '#0A7ACA', bg: 'rgba(90,200,250,0.1)' },
  { cls: 'method-tag-6', color: '#C44060', bg: 'rgba(255,100,130,0.1)' },
  { cls: 'method-tag-7', color: '#1A8A9E', bg: 'rgba(48,176,199,0.1)' },
];

export function getTagClass(index) {
  return TAG_COLORS[index % TAG_COLORS.length].cls;
}

// ========== 学科定义 ==========
export const DISCIPLINES = [
  // ─────────── 设计学 ───────────
  {
    id: 'design',
    label: '设计学',
    labelEn: 'Design',
    icon: 'ri-palette-line',
    cssClass: 'disc-design',
    description: '参与式设计、共同设计、设计思维等',
    methods: [
      {
        id: 'participatory_design',
        label: '参与式设计',
        labelEn: 'Participatory Design',
        keywords: [
          'participatory design', 'participatory approach', 'participatory method',
          'participatory process', 'participatory workshop', 'participatory research',
        ],
        abstractPatterns: [
          /participatory\s+design/i,
          /participatory\s+approach/i,
          /participatory\s+method/i,
          /participatory\s+workshop/i,
        ]
      },
      {
        id: 'co_design',
        label: '共同设计',
        labelEn: 'Co-Design',
        keywords: [
          'co-design', 'codesign', 'co-creation', 'co-create', 'co-designed',
          'co-designing', 'collaborative design', 'co-development',
        ],
        abstractPatterns: [
          /co[\-\s]?design/i,
          /co[\-\s]?creation/i,
          /collaborative\s+design/i,
        ]
      },
      {
        id: 'user_centered_design',
        label: '用户中心设计',
        labelEn: 'User-Centered Design',
        keywords: [
          'user-centered design', 'user centered design', 'ucd',
          'user-centred design', 'user centred design',
          'user-centered approach', 'user-driven design',
        ],
        abstractPatterns: [
          /user[\-\s]?cent(?:e|re)d\s+design/i,
          /user[\-\s]?cent(?:e|re)d\s+approach/i,
          /user[\-\s]?driven\s+design/i,
        ]
      },
      {
        id: 'human_centered_design',
        label: '以人为中心设计',
        labelEn: 'Human-Centered Design',
        keywords: [
          'human-centered design', 'human centered design', 'hcd',
          'human-centred design', 'human centred design',
          'human-centric design', 'human-centered approach',
        ],
        abstractPatterns: [
          /human[\-\s]?cent(?:e|re)d\s+design/i,
          /human[\-\s]?centric\s+design/i,
        ]
      },
      {
        id: 'design_thinking',
        label: '设计思维',
        labelEn: 'Design Thinking',
        keywords: [
          'design thinking', 'design sprint', 'design ideation',
          'empathize', 'ideate', 'prototype and test',
        ],
        abstractPatterns: [
          /design\s+thinking/i,
          /design\s+sprint/i,
        ]
      },
      {
        id: 'speculative_design',
        label: '思辨设计',
        labelEn: 'Speculative Design',
        keywords: [
          'speculative design', 'speculative fiction', 'design fiction',
          'science fiction prototyping', 'design probe', 'cultural probe',
          'design probes', 'cultural probes',
        ],
        abstractPatterns: [
          /speculative\s+design/i,
          /design\s+fiction/i,
          /design\s+probes?/i,
          /cultural\s+probes?/i,
        ]
      },
      {
        id: 'design_activity',
        label: '设计活动/工作坊',
        labelEn: 'Design Activity / Workshop',
        keywords: [
          'design activity', 'design workshop', 'design session',
          'focus group', 'design study', 'needfinding',
          'stakeholder workshop', 'design exploration',
        ],
        abstractPatterns: [
          /design\s+activit/i,
          /design\s+workshop/i,
          /design\s+session/i,
          /focus\s+group/i,
          /needfinding/i,
        ]
      },
      {
        id: 'wizard_of_oz',
        label: 'WoZ方法',
        labelEn: 'Wizard of Oz',
        keywords: [
          'wizard of oz', 'wizard-of-oz', 'woz',
          'wizard of oz study', 'woz technique',
        ],
        abstractPatterns: [
          /wizard[\-\s]?of[\-\s]?oz/i,
          /\bWoZ\b/,
        ]
      },
    ]
  },

  // ─────────── 计算机科学 ───────────
  {
    id: 'cs',
    label: '计算机科学',
    labelEn: 'Computer Science',
    icon: 'ri-code-s-slash-line',
    cssClass: 'disc-cs',
    description: '深度学习、强化学习、联邦学习等',
    methods: [
      {
        id: 'deep_learning',
        label: '深度学习',
        labelEn: 'Deep Learning',
        keywords: [
          'deep learning', 'deep neural network', 'convolutional neural network',
          'cnn', 'recurrent neural network', 'rnn', 'transformer', 'bert', 'gpt',
          'attention mechanism', 'autoencoder', 'generative adversarial',
        ],
        abstractPatterns: [
          /deep\s+learning/i,
          /deep\s+neural\s+network/i,
          /convolutional\s+neural/i,
          /transformer[\-\s]?based/i,
          /generative\s+adversarial/i,
        ]
      },
      {
        id: 'reinforcement_learning',
        label: '强化学习',
        labelEn: 'Reinforcement Learning',
        keywords: [
          'reinforcement learning', 'q-learning', 'policy gradient',
          'deep reinforcement learning', 'multi-agent reinforcement',
          'reward shaping', 'markov decision process',
        ],
        abstractPatterns: [
          /reinforcement\s+learning/i,
          /q[\-\s]?learning/i,
          /policy\s+gradient/i,
          /deep\s+reinforcement/i,
        ]
      },
      {
        id: 'federated_learning',
        label: '联邦学习',
        labelEn: 'Federated Learning',
        keywords: [
          'federated learning', 'federated optimization', 'federated averaging',
          'fedavg', 'privacy-preserving learning', 'distributed learning',
        ],
        abstractPatterns: [
          /federated\s+learning/i,
          /federated\s+optim/i,
          /fedavg/i,
        ]
      },
      {
        id: 'transfer_learning',
        label: '迁移学习',
        labelEn: 'Transfer Learning',
        keywords: [
          'transfer learning', 'domain adaptation', 'fine-tuning',
          'pre-trained model', 'pretrained', 'few-shot learning',
          'zero-shot learning', 'meta-learning',
        ],
        abstractPatterns: [
          /transfer\s+learning/i,
          /domain\s+adaptation/i,
          /few[\-\s]?shot\s+learning/i,
          /zero[\-\s]?shot\s+learning/i,
          /meta[\-\s]?learning/i,
        ]
      },
      {
        id: 'graph_neural_network',
        label: '图神经网络',
        labelEn: 'Graph Neural Network',
        keywords: [
          'graph neural network', 'gnn', 'graph convolutional',
          'graph attention', 'knowledge graph', 'graph embedding',
        ],
        abstractPatterns: [
          /graph\s+neural\s+network/i,
          /graph\s+convolutional/i,
          /graph\s+attention/i,
          /\bGNN\b/,
        ]
      },
      {
        id: 'nlp',
        label: '自然语言处理',
        labelEn: 'Natural Language Processing',
        keywords: [
          'natural language processing', 'nlp', 'text mining', 'sentiment analysis',
          'named entity recognition', 'machine translation', 'text classification',
          'language model', 'large language model', 'llm',
        ],
        abstractPatterns: [
          /natural\s+language\s+processing/i,
          /sentiment\s+analysis/i,
          /named\s+entity\s+recognition/i,
          /language\s+model/i,
          /large\s+language\s+model/i,
        ]
      },
      {
        id: 'computer_vision',
        label: '计算机视觉',
        labelEn: 'Computer Vision',
        keywords: [
          'computer vision', 'object detection', 'image segmentation',
          'image classification', 'image recognition', 'visual recognition',
          'semantic segmentation', 'instance segmentation', 'pose estimation',
        ],
        abstractPatterns: [
          /computer\s+vision/i,
          /object\s+detection/i,
          /image\s+segmentation/i,
          /semantic\s+segmentation/i,
          /pose\s+estimation/i,
        ]
      },
      {
        id: 'knowledge_distillation',
        label: '知识蒸馏',
        labelEn: 'Knowledge Distillation',
        keywords: [
          'knowledge distillation', 'model compression', 'model pruning',
          'teacher-student', 'network pruning', 'quantization',
        ],
        abstractPatterns: [
          /knowledge\s+distillation/i,
          /model\s+compression/i,
          /teacher[\-\s]?student/i,
          /model\s+pruning/i,
        ]
      },
      {
        id: 'recommendation_system',
        label: '推荐系统',
        labelEn: 'Recommendation System',
        keywords: [
          'recommendation system', 'recommender system', 'collaborative filtering',
          'content-based filtering', 'matrix factorization', 'click-through rate',
        ],
        abstractPatterns: [
          /recommend(?:ation|er)\s+system/i,
          /collaborative\s+filtering/i,
          /matrix\s+factorization/i,
        ]
      },
      {
        id: 'robotic_system',
        label: '机器人系统',
        labelEn: 'Robotic System',
        keywords: [
          'robotic system', 'robot learning', 'autonomous robot',
          'robot navigation', 'robot manipulation', 'motion planning',
          'slam', 'simultaneous localization',
        ],
        abstractPatterns: [
          /robotic\s+system/i,
          /robot\s+learning/i,
          /autonomous\s+robot/i,
          /motion\s+planning/i,
          /simultaneous\s+localization/i,
        ]
      },
    ]
  },

  // ─────────── 心理学 ───────────
  {
    id: 'psychology',
    label: '心理学',
    labelEn: 'Psychology',
    icon: 'ri-mental-health-line',
    cssClass: 'disc-psych',
    description: '认知实验、行为实验、脑成像等',
    methods: [
      {
        id: 'cognitive_experiment',
        label: '认知实验',
        labelEn: 'Cognitive Experiment',
        keywords: [
          'cognitive experiment', 'cognitive task', 'stroop task',
          'flanker task', 'n-back task', 'working memory task',
          'attention task', 'cognitive assessment', 'reaction time',
        ],
        abstractPatterns: [
          /cognitive\s+(?:experiment|task)/i,
          /stroop\s+task/i,
          /flanker\s+task/i,
          /n[\-\s]?back\s+task/i,
          /working\s+memory\s+task/i,
        ]
      },
      {
        id: 'behavioral_experiment',
        label: '行为实验',
        labelEn: 'Behavioral Experiment',
        keywords: [
          'behavioral experiment', 'behavioural experiment', 'behavioral study',
          'behavioral task', 'behavioral measure', 'behavioral assessment',
          'behavioral intervention', 'behavioral observation',
        ],
        abstractPatterns: [
          /behavio(?:u)?ral\s+experiment/i,
          /behavio(?:u)?ral\s+(?:study|task)/i,
          /behavio(?:u)?ral\s+intervention/i,
        ]
      },
      {
        id: 'neuroimaging',
        label: 'ERP/脑成像',
        labelEn: 'ERP / Neuroimaging',
        keywords: [
          'erp', 'event-related potential', 'fmri', 'functional magnetic resonance',
          'eeg', 'electroencephalography', 'neuroimaging', 'brain imaging',
          'fnirs', 'pet scan', 'meg', 'magnetoencephalography',
        ],
        abstractPatterns: [
          /event[\-\s]?related\s+potential/i,
          /\bERP\b/,
          /\bfMRI\b/i,
          /functional\s+magnetic\s+resonance/i,
          /\bEEG\b/,
          /electroencephalograph/i,
          /neuroimaging/i,
          /\bfNIRS\b/i,
        ]
      },
      {
        id: 'psychometric_scale',
        label: '量表测评',
        labelEn: 'Psychometric Scale',
        keywords: [
          'psychometric', 'likert scale', 'questionnaire', 'self-report',
          'psychological scale', 'measurement scale', 'assessment scale',
          'inventory', 'reliability', 'validity', 'cronbach',
        ],
        abstractPatterns: [
          /likert\s+scale/i,
          /psychometric/i,
          /self[\-\s]?report\s+(?:measure|questionnaire|scale)/i,
          /cronbach/i,
        ]
      },
      {
        id: 'longitudinal_study',
        label: '纵向追踪',
        labelEn: 'Longitudinal Study',
        keywords: [
          'longitudinal study', 'longitudinal design', 'longitudinal research',
          'follow-up study', 'panel study', 'cohort study',
          'developmental trajectory', 'repeated measures',
        ],
        abstractPatterns: [
          /longitudinal\s+(?:study|design|research)/i,
          /follow[\-\s]?up\s+study/i,
          /developmental\s+trajectory/i,
          /repeated\s+measures/i,
        ]
      },
      {
        id: 'eye_tracking',
        label: '眼动实验',
        labelEn: 'Eye Tracking',
        keywords: [
          'eye tracking', 'eye-tracking', 'eye movement', 'gaze tracking',
          'fixation', 'saccade', 'pupil dilation', 'visual attention',
        ],
        abstractPatterns: [
          /eye[\-\s]?tracking/i,
          /eye\s+movement/i,
          /gaze\s+tracking/i,
          /saccade/i,
          /pupil\s+dilation/i,
        ]
      },
      {
        id: 'developmental_psychology',
        label: '发展心理学实验',
        labelEn: 'Developmental Psychology',
        keywords: [
          'developmental psychology', 'child development', 'cognitive development',
          'infant study', 'preschool children', 'adolescent development',
          'aging', 'lifespan development',
        ],
        abstractPatterns: [
          /developmental\s+psycholog/i,
          /child\s+development/i,
          /cognitive\s+development/i,
          /infant\s+(?:study|studi)/i,
          /adolescent\s+development/i,
        ]
      },
      {
        id: 'clinical_trial_psych',
        label: '临床心理实验',
        labelEn: 'Clinical Psychology Trial',
        keywords: [
          'clinical trial', 'clinical psychology', 'psychotherapy',
          'cognitive behavioral therapy', 'cbt', 'treatment outcome',
          'randomized controlled', 'placebo', 'clinical intervention',
        ],
        abstractPatterns: [
          /cognitive\s+behavio(?:u)?ral\s+therapy/i,
          /\bCBT\b/,
          /psychotherapy/i,
          /treatment\s+outcome/i,
          /clinical\s+intervention/i,
        ]
      },
    ]
  },

  // ─────────── 教育学 ───────────
  {
    id: 'education',
    label: '教育学',
    labelEn: 'Education',
    icon: 'ri-graduation-cap-line',
    cssClass: 'disc-edu',
    description: '行动研究、教学实验、设计研究等',
    methods: [
      {
        id: 'action_research',
        label: '行动研究',
        labelEn: 'Action Research',
        keywords: [
          'action research', 'participatory action research', 'classroom action research',
          'practitioner research', 'teacher research', 'action inquiry',
        ],
        abstractPatterns: [
          /action\s+research/i,
          /participatory\s+action\s+research/i,
          /classroom\s+action/i,
          /practitioner\s+research/i,
        ]
      },
      {
        id: 'teaching_experiment',
        label: '教学实验',
        labelEn: 'Teaching Experiment',
        keywords: [
          'teaching experiment', 'instructional experiment', 'classroom experiment',
          'pedagogical experiment', 'educational experiment', 'learning experiment',
          'instructional design', 'instructional intervention',
        ],
        abstractPatterns: [
          /teaching\s+experiment/i,
          /instructional\s+(?:experiment|intervention)/i,
          /classroom\s+experiment/i,
          /pedagogical\s+experiment/i,
          /educational\s+experiment/i,
        ]
      },
      {
        id: 'design_based_research',
        label: '设计研究(DBR)',
        labelEn: 'Design-Based Research',
        keywords: [
          'design-based research', 'design based research', 'dbr',
          'design experiment', 'educational design research',
          'design research', 'iterative design',
        ],
        abstractPatterns: [
          /design[\-\s]?based\s+research/i,
          /\bDBR\b/,
          /educational\s+design\s+research/i,
        ]
      },
      {
        id: 'narrative_research',
        label: '叙事研究',
        labelEn: 'Narrative Research',
        keywords: [
          'narrative research', 'narrative inquiry', 'narrative analysis',
          'storytelling', 'life history', 'autobiography', 'biographical',
        ],
        abstractPatterns: [
          /narrative\s+(?:research|inquiry|analysis)/i,
          /life\s+history/i,
        ]
      },
      {
        id: 'classroom_observation',
        label: '课堂观察',
        labelEn: 'Classroom Observation',
        keywords: [
          'classroom observation', 'lesson observation', 'teaching observation',
          'classroom interaction', 'classroom discourse', 'video analysis',
        ],
        abstractPatterns: [
          /classroom\s+observation/i,
          /lesson\s+observation/i,
          /classroom\s+(?:interaction|discourse)/i,
        ]
      },
      {
        id: 'educational_ethnography',
        label: '教育民族志',
        labelEn: 'Educational Ethnography',
        keywords: [
          'educational ethnography', 'school ethnography', 'classroom ethnography',
          'ethnographic study', 'ethnographic research', 'participant observation',
        ],
        abstractPatterns: [
          /educational\s+ethnograph/i,
          /school\s+ethnograph/i,
          /classroom\s+ethnograph/i,
          /ethnographic\s+(?:study|research)/i,
        ]
      },
      {
        id: 'learning_analytics',
        label: '学习分析',
        labelEn: 'Learning Analytics',
        keywords: [
          'learning analytics', 'educational data mining', 'learning management system',
          'mooc', 'online learning', 'e-learning', 'blended learning',
          'adaptive learning', 'educational technology',
        ],
        abstractPatterns: [
          /learning\s+analytics/i,
          /educational\s+data\s+mining/i,
          /\bMOOC\b/i,
          /adaptive\s+learning/i,
        ]
      },
      {
        id: 'curriculum_study',
        label: '课程研究',
        labelEn: 'Curriculum Study',
        keywords: [
          'curriculum study', 'curriculum design', 'curriculum development',
          'curriculum evaluation', 'syllabus', 'course design',
          'learning outcome', 'competency-based',
        ],
        abstractPatterns: [
          /curriculum\s+(?:study|design|development|evaluation)/i,
          /competency[\-\s]?based/i,
        ]
      },
    ]
  },

  // ─────────── 医学/公共卫生 ───────────
  {
    id: 'medicine',
    label: '医学 / 公共卫生',
    labelEn: 'Medicine / Public Health',
    icon: 'ri-heart-pulse-line',
    cssClass: 'disc-med',
    description: 'RCT、队列研究、Meta分析等',
    methods: [
      {
        id: 'rct',
        label: '随机对照试验',
        labelEn: 'Randomized Controlled Trial',
        keywords: [
          'randomized controlled trial', 'randomised controlled trial',
          'rct', 'randomized trial', 'randomised trial',
          'double-blind', 'single-blind', 'placebo-controlled',
        ],
        abstractPatterns: [
          /randomi[sz]ed\s+controlled\s+trial/i,
          /\bRCT\b/,
          /double[\-\s]?blind/i,
          /placebo[\-\s]?controlled/i,
        ]
      },
      {
        id: 'cohort_study',
        label: '队列研究',
        labelEn: 'Cohort Study',
        keywords: [
          'cohort study', 'prospective cohort', 'retrospective cohort',
          'longitudinal cohort', 'birth cohort', 'follow-up',
        ],
        abstractPatterns: [
          /cohort\s+study/i,
          /prospective\s+cohort/i,
          /retrospective\s+cohort/i,
          /birth\s+cohort/i,
        ]
      },
      {
        id: 'case_control',
        label: '病例对照研究',
        labelEn: 'Case-Control Study',
        keywords: [
          'case-control study', 'case control study', 'matched case-control',
          'nested case-control', 'odds ratio',
        ],
        abstractPatterns: [
          /case[\-\s]?control\s+study/i,
          /matched\s+case[\-\s]?control/i,
          /nested\s+case[\-\s]?control/i,
        ]
      },
      {
        id: 'cross_sectional',
        label: '横断面研究',
        labelEn: 'Cross-Sectional Study',
        keywords: [
          'cross-sectional study', 'cross sectional study',
          'cross-sectional survey', 'cross-sectional analysis',
          'prevalence study', 'population-based survey',
        ],
        abstractPatterns: [
          /cross[\-\s]?sectional\s+(?:study|survey|analysis)/i,
          /prevalence\s+study/i,
        ]
      },
      {
        id: 'meta_analysis',
        label: 'Meta分析',
        labelEn: 'Meta-Analysis',
        keywords: [
          'meta-analysis', 'meta analysis', 'systematic review',
          'systematic literature review', 'forest plot', 'heterogeneity',
          'publication bias', 'funnel plot', 'effect size',
        ],
        abstractPatterns: [
          /meta[\-\s]?analysis/i,
          /systematic\s+(?:literature\s+)?review/i,
          /forest\s+plot/i,
          /publication\s+bias/i,
        ]
      },
      {
        id: 'clinical_trial',
        label: '临床试验',
        labelEn: 'Clinical Trial',
        keywords: [
          'clinical trial', 'phase i trial', 'phase ii trial', 'phase iii trial',
          'drug trial', 'multicenter trial', 'open-label',
          'dose-response', 'pharmacokinetic',
        ],
        abstractPatterns: [
          /clinical\s+trial/i,
          /phase\s+[iI]{1,3}\s+trial/i,
          /multicent(?:er|re)\s+trial/i,
          /open[\-\s]?label/i,
        ]
      },
      {
        id: 'epidemiological',
        label: '流行病学研究',
        labelEn: 'Epidemiological Study',
        keywords: [
          'epidemiological study', 'epidemiological survey', 'incidence',
          'mortality', 'morbidity', 'disease surveillance', 'outbreak',
          'risk factor', 'hazard ratio',
        ],
        abstractPatterns: [
          /epidemiological\s+(?:study|survey)/i,
          /disease\s+surveillance/i,
          /hazard\s+ratio/i,
        ]
      },
      {
        id: 'qualitative_health',
        label: '定性健康研究',
        labelEn: 'Qualitative Health Research',
        keywords: [
          'qualitative health', 'patient experience', 'patient perspective',
          'healthcare workers', 'phenomenology', 'lived experience',
          'patient interview', 'health literacy',
        ],
        abstractPatterns: [
          /qualitative\s+health/i,
          /patient\s+(?:experience|perspective)/i,
          /phenomenolog/i,
          /lived\s+experience/i,
        ]
      },
    ]
  },

  // ─────────── 社会学 ───────────
  {
    id: 'sociology',
    label: '社会学',
    labelEn: 'Sociology',
    icon: 'ri-team-line',
    cssClass: 'disc-soc',
    description: '民族志、扎根理论、话语分析等',
    methods: [
      {
        id: 'ethnography',
        label: '民族志',
        labelEn: 'Ethnography',
        keywords: [
          'ethnography', 'ethnographic', 'fieldwork', 'field work',
          'participant observation', 'immersive research', 'thick description',
        ],
        abstractPatterns: [
          /ethnograph/i,
          /fieldwork/i,
          /participant\s+observation/i,
          /thick\s+description/i,
        ]
      },
      {
        id: 'grounded_theory',
        label: '扎根理论',
        labelEn: 'Grounded Theory',
        keywords: [
          'grounded theory', 'theoretical sampling', 'axial coding',
          'open coding', 'selective coding', 'constant comparative',
          'theoretical saturation',
        ],
        abstractPatterns: [
          /grounded\s+theory/i,
          /theoretical\s+sampling/i,
          /axial\s+coding/i,
          /constant\s+comparative/i,
          /theoretical\s+saturation/i,
        ]
      },
      {
        id: 'discourse_analysis',
        label: '话语分析',
        labelEn: 'Discourse Analysis',
        keywords: [
          'discourse analysis', 'critical discourse analysis', 'cda',
          'conversation analysis', 'discursive', 'discourse study',
        ],
        abstractPatterns: [
          /discourse\s+analysis/i,
          /critical\s+discourse/i,
          /conversation\s+analysis/i,
          /\bCDA\b/,
        ]
      },
      {
        id: 'social_network_analysis',
        label: '社会网络分析',
        labelEn: 'Social Network Analysis',
        keywords: [
          'social network analysis', 'network analysis', 'social network',
          'network theory', 'centrality', 'social graph', 'tie strength',
        ],
        abstractPatterns: [
          /social\s+network\s+analysis/i,
          /network\s+analysis/i,
          /social\s+graph/i,
        ]
      },
      {
        id: 'oral_history',
        label: '口述史',
        labelEn: 'Oral History',
        keywords: [
          'oral history', 'life story', 'biographical method',
          'testimony', 'personal narrative', 'memory study',
        ],
        abstractPatterns: [
          /oral\s+history/i,
          /life\s+story/i,
          /biographical\s+method/i,
        ]
      },
      {
        id: 'comparative_study',
        label: '比较研究',
        labelEn: 'Comparative Study',
        keywords: [
          'comparative study', 'comparative analysis', 'cross-cultural',
          'cross-national', 'comparative method', 'comparative approach',
        ],
        abstractPatterns: [
          /comparative\s+(?:study|analysis|method)/i,
          /cross[\-\s]?cultural/i,
          /cross[\-\s]?national/i,
        ]
      },
      {
        id: 'survey_research',
        label: '社会调查',
        labelEn: 'Survey Research',
        keywords: [
          'survey research', 'social survey', 'national survey',
          'population survey', 'large-scale survey', 'sampling method',
          'stratified sampling', 'probability sampling',
        ],
        abstractPatterns: [
          /(?:social|national|population|large[\-\s]?scale)\s+survey/i,
          /survey\s+research/i,
          /stratified\s+sampling/i,
        ]
      },
      {
        id: 'content_analysis_soc',
        label: '内容分析',
        labelEn: 'Content Analysis',
        keywords: [
          'content analysis', 'media analysis', 'textual analysis',
          'frame analysis', 'framing analysis', 'coding scheme',
        ],
        abstractPatterns: [
          /content\s+analysis/i,
          /media\s+analysis/i,
          /frame\s+analysis/i,
          /framing\s+analysis/i,
        ]
      },
    ]
  },
];

// ========== 通用研究方法（跨学科，阅读报告用） ==========
export const GENERAL_METHODS = [
  { label: '问卷调查', pattern: /(?:questionnaire|survey|likert\s+scale)/i },
  { label: '访谈', pattern: /(?:semi[\-\s]?structured\s+interview|interview(?:s|ed)|in[\-\s]?depth\s+interview)/i },
  { label: '用户实验', pattern: /(?:user\s+study|user\s+experiment|usability\s+(?:test|study|evaluation))/i },
  { label: '对照实验', pattern: /(?:controlled\s+experiment|between[\-\s]?subject|within[\-\s]?subject)/i },
  { label: '主题分析', pattern: /(?:thematic\s+analysis|theme\s+analysis)/i },
  { label: '扎根理论', pattern: /(?:grounded\s+theory)/i },
  { label: '案例研究', pattern: /(?:case\s+stud(?:y|ies))/i },
  { label: '民族志', pattern: /(?:ethnograph)/i },
  { label: '内容分析', pattern: /(?:content\s+analysis)/i },
  { label: '原型测试', pattern: /(?:prototype\s+(?:test|evaluat))/i },
  { label: '启发式评估', pattern: /(?:heuristic\s+evaluation)/i },
  { label: '现场研究', pattern: /(?:field\s+study|field\s+research|in[\-\s]?the[\-\s]?wild)/i },
  { label: '机器学习', pattern: /(?:machine\s+learning|deep\s+learning|neural\s+network)/i },
  { label: 'A/B测试', pattern: /(?:A\/B\s+test)/i },
  { label: '仿真实验', pattern: /(?:simulation\s+(?:experiment|study))/i },
  { label: '认知走查', pattern: /(?:cognitive\s+walkthrough)/i },
  { label: '系统文献综述', pattern: /(?:systematic\s+(?:literature\s+)?review|meta[\-\s]?analysis)/i },
  { label: '混合方法', pattern: /(?:mixed[\-\s]?method)/i },
  { label: '日记法', pattern: /(?:diary\s+stud|diary\s+method|experience\s+sampling)/i },
  { label: '焦点小组', pattern: /(?:focus\s+group)/i },
  { label: '观察法', pattern: /(?:observation(?:al)?\s+(?:study|method|research))/i },
];

// ========== 辅助函数 ==========
/** 获取学科配置 */
export function getDiscipline(id) {
  return DISCIPLINES.find(d => d.id === id) || null;
}

/** 获取所有学科的方法拍平为一个数组（阅读报告用） */
export function getAllMethodsFlat() {
  const result = [];
  for (const disc of DISCIPLINES) {
    for (const method of disc.methods) {
      result.push({
        ...method,
        disciplineId: disc.id,
        disciplineLabel: disc.label,
      });
    }
  }
  return result;
}
