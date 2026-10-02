// Single source of truth for every piece of copy on the site.
// Edit this file to update the portfolio; nothing else needs to change.

export type ProjectSlug = 'phishguard' | 'github-agent' | 'churn'

export const profile = {
  name: 'Tharun Venkata Sai Kumar',
  shortName: 'THARUN',
  title: 'Software Developer · AI/ML',
  tagline: 'I build AI-powered software, from phishing detectors to autonomous agents.',
  email: 'tsai3822@gmail.com',
  github: 'https://github.com/Tharungrandisilla',
  linkedin: 'https://www.linkedin.com/in/tharun-grandisilla',
  // Drop your PDF at public/Tharun_Resume.pdf (or change this path).
  resume: '/Tharun_Venkata_Sai_Kumar_Resume.pdf',
}

export interface LayerDef {
  id: string
  /** label used in the layer indicator */
  label: string
  /** layer type shown in the heading, e.g. [dense] */
  kind: string
  /** tensor-shape style annotation */
  shape: string
}

export const layers: LayerDef[] = [
  { id: 'input', label: 'Home', kind: 'input', shape: 'x ∈ ℝ[1×512]' },
  { id: 'about', label: 'About', kind: 'embedding', shape: 'out: (1, 256)' },
  { id: 'skills', label: 'Skills', kind: 'dense', shape: 'out: (6, n)' },
  { id: 'internship', label: 'Internship', kind: 'attention', shape: 'out: (1, 3, 128)' },
  { id: 'projects', label: 'Projects', kind: 'transformer', shape: 'out: (3, 512)' },
  { id: 'education', label: 'Education', kind: 'norm', shape: 'out: (5, 64)' },
  { id: 'contact', label: 'Contact', kind: 'softmax', shape: 'ŷ ∈ Δ¹' },
]

export const about = {
  summary:
    'CSE undergraduate and AI/ML intern experienced in building AI-powered software in Python. Projects include a real-time phishing detection system that combines DistilBERT, LightGBM, and an on-device LLM (96.8% accuracy), and an AI agent that automates GitHub publishing through the Model Context Protocol (MCP). Strong foundation in Data Structures and Algorithms, OOP, and Java. Seeking a Software Developer role.',
  card: [
    ['role.target', 'Software Developer'],
    ['education', 'B.Tech CSE · LPU'],
    ['intern', 'AI/ML · Eversoft Technologies'],
    ['best.metric', '96.8% accuracy'],
    ['status', 'open_to_work'],
  ] as [string, string][],
}

export interface SkillCategory {
  id: string
  name: string
  color: string
  skills: string[]
}

export const skillCategories: SkillCategory[] = [
  { id: 'lang', name: 'Programming Languages', color: '#3EE6D4', skills: ['Python', 'Java', 'SQL', 'R'] },
  {
    id: 'ai',
    name: 'AI/ML',
    color: '#FFB547',
    skills: [
      'Machine Learning',
      'Generative AI',
      'Agentic AI',
      'NLP',
      'Large Language Models (LLMs)',
      'AI Agents',
      'Model Context Protocol (MCP)',
      'Feature Engineering',
      'Model Evaluation',
    ],
  },
  {
    id: 'lib',
    name: 'Libraries and Frameworks',
    color: '#6FA8FF',
    skills: [
      'Scikit-learn',
      'LightGBM',
      'Hugging Face Transformers (DistilBERT)',
      'TensorFlow',
      'Pandas',
      'NumPy',
      'Matplotlib',
      'Seaborn',
      'BeautifulSoup',
    ],
  },
  { id: 'web', name: 'Databases and Web', color: '#A78BFA', skills: ['SQL', 'SQLite', 'HTML5', 'CSS3', 'JavaScript'] },
  {
    id: 'tools',
    name: 'Tools and Platforms',
    color: '#C9D1DC',
    skills: ['Git', 'GitHub', 'Ollama', 'Gmail API', 'PyInstaller', 'Power BI', 'Tableau', 'Microsoft Excel'],
  },
  { id: 'cs', name: 'Core CS', color: '#8EE6A8', skills: ['Data Structures and Algorithms', 'OOP', 'Debugging'] },
]

/**
 * Which projects used which skill. Derived strictly from each project's stack and
 * description below. Skills with no entry were not part of a listed project.
 */
export const skillProjects: Record<string, ProjectSlug[]> = {
  Python: ['phishguard', 'github-agent', 'churn'],
  SQL: [],
  SQLite: ['phishguard'],
  'Machine Learning': ['phishguard', 'churn'],
  'Generative AI': ['phishguard'],
  'Agentic AI': ['github-agent'],
  NLP: ['phishguard'],
  'Large Language Models (LLMs)': ['phishguard'],
  'AI Agents': ['github-agent'],
  'Model Context Protocol (MCP)': ['github-agent'],
  'Feature Engineering': ['phishguard'],
  'Model Evaluation': ['phishguard', 'churn'],
  'Scikit-learn': ['churn'],
  LightGBM: ['phishguard'],
  'Hugging Face Transformers (DistilBERT)': ['phishguard'],
  Pandas: ['churn'],
  NumPy: ['churn'],
  Matplotlib: ['churn'],
  Seaborn: ['churn'],
  Git: ['github-agent'],
  GitHub: ['github-agent'],
  Ollama: ['phishguard'],
  'Gmail API': ['phishguard'],
}

export const internship = {
  role: 'AI/ML Intern',
  company: 'Eversoft Technologies',
  points: [
    'Gained hands-on experience across Machine Learning, Generative AI, and Agentic AI through enterprise AI engineering work.',
    'Worked with LLMs and AI agent workflows, exploring how agents plan multi-step tasks, use tools, and automate developer processes.',
    'Applied the end-to-end ML workflow: data preprocessing, feature engineering, model training, and evaluation.',
  ],
}

export interface Project {
  slug: ProjectSlug
  index: string
  name: string
  subtitle: string
  stack: string[]
  bullets: string[]
  metrics?: { value: number; decimals: number; prefix?: string; suffix: string; label: string }[]
  extraMetrics?: string
  badge?: string
  github: string
  scene: string
  accent: 'red' | 'cyan' | 'amber'
}

export const projects: Project[] = [
  {
    slug: 'phishguard',
    index: '01',
    name: 'PhishGuard AI',
    subtitle: 'A local phishing detection system (team project, five members)',
    stack: ['Python', 'DistilBERT', 'LightGBM', 'Phi-2 via Ollama', 'SQLite', 'IMAP/Gmail API'],
    bullets: [
      'A real-time, fully local phishing detector that scans incoming emails before the user opens them.',
      'A hybrid pipeline: 37 structural features plus a fine-tuned DistilBERT score, fed into a LightGBM classifier with three outputs (Safe, Suspicious, Phishing).',
      'Results: 96.8% accuracy, 94.9% F1-score, 0.980 AUC-ROC on 10,000 test emails, ~230 ms latency.',
      'An on-device Phi-2 LLM explains in plain language why each email was flagged.',
    ],
    metrics: [
      { value: 96.8, decimals: 1, suffix: '%', label: 'accuracy' },
      { value: 0.98, decimals: 3, suffix: ' AUC', label: 'roc-auc' },
      { value: 230, decimals: 0, suffix: 'ms', label: 'latency' },
    ],
    extraMetrics: 'F1 94.9% · 10,000 test emails',
    badge: 'Co-developed in a 5-member team',
    github: 'https://github.com/Tharungrandisilla/Phishguard_LLM',
    scene: 'Envelopes stream toward a shield. Safe mail passes in cyan; phishing is caught and turns red.',
    accent: 'red',
  },
  {
    slug: 'github-agent',
    index: '02',
    name: 'GitHub Repo Agent',
    subtitle: 'Agent that publishes local projects through the official GitHub MCP server',
    stack: ['Python', 'GitHub MCP Server', 'Git'],
    bullets: [
      'An agent that discovers local projects, detects their type, and publishes them to GitHub through the official GitHub MCP server.',
      'A security scanner blocks the push if it detects API keys, tokens, or passwords.',
      'It auto-generates the README and .gitignore and runs the full Git workflow, then verifies the upload through MCP.',
    ],
    github: 'https://github.com/Tharungrandisilla/GitHub-Agent',
    scene: 'A pipeline Discover → Scan → Prepare → Commit → Push → Verify. A packet carrying a secret is stopped at Scan.',
    accent: 'cyan',
  },
  {
    slug: 'churn',
    index: '03',
    name: 'Customer Churn Prediction',
    subtitle: 'Supervised ML on telecom customer data',
    stack: ['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'Matplotlib', 'Seaborn'],
    bullets: [
      'A supervised ML model that predicts telecom customer churn from 7,000+ customers and 20+ attributes.',
      'Compares Logistic Regression (~80%) with Random Forest (~84%), with feature importance analysis of the churn drivers.',
    ],
    metrics: [
      { value: 80, decimals: 0, prefix: '~', suffix: '%', label: 'logistic reg.' },
      { value: 84, decimals: 0, prefix: '~', suffix: '%', label: 'random forest' },
    ],
    github: 'https://github.com/Tharungrandisilla/customer-churnn-prediction',
    scene: 'A rotating forest of low-poly decision trees; a decision path lights up and votes Churn or Stay.',
    accent: 'amber',
  },
]

export const education = {
  schools: [
    {
      name: 'Lovely Professional University',
      place: 'Punjab, India',
      detail: 'B.Tech in Computer Science and Engineering',
      period: '2022 – 2026',
    },
    {
      name: 'ViswaSai Junior College',
      place: 'Vinukonda, Guntur',
      detail: 'Intermediate',
      period: 'Apr 2021 – Mar 2022',
    },
    {
      name: 'Geethanjali High School',
      place: 'Vinukonda, Guntur',
      detail: '10th Standard',
      period: 'Apr 2019 – Mar 2020',
    },
  ],
  certifications: [
    { name: 'Supervised Machine Learning', issuer: 'Coursera', date: 'Oct 2024' },
    { name: 'Cloud Computing', issuer: 'NPTEL', date: 'Jun 2024' },
  ],
}

export const contact = {
  footer: 'Inference complete. Thanks for scrolling.',
}
