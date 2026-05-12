// ================================================
// AI RESUME ROASTER — app.js
// ================================================

const CONFIG = {
  HF_TOKEN: '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',
  HF_MODEL: 'mistralai/Mistral-7B-Instruct-v0.2',
  MAX_SIZE:  5 * 1024 * 1024
};

let selectedFile = null;
let resumeText   = '';

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  loadSettings();
  bindEvents();
});

// ── Settings ──────────────────────────────────
function loadSettings() {
  const tok = localStorage.getItem('hf_token') || CONFIG.HF_TOKEN;
  const mdl = localStorage.getItem('hf_model') || CONFIG.HF_MODEL;
  document.getElementById('hfApiKey').value = tok;
  document.getElementById('hfModel').value  = mdl;
  CONFIG.HF_TOKEN = tok;
  CONFIG.HF_MODEL = mdl;
}
function saveSettings() {
  CONFIG.HF_TOKEN = document.getElementById('hfApiKey').value.trim();
  CONFIG.HF_MODEL = document.getElementById('hfModel').value;
  localStorage.setItem('hf_token', CONFIG.HF_TOKEN);
  localStorage.setItem('hf_model', CONFIG.HF_MODEL);
  closeSettings();
  toast('✅ Settings saved');
}

// ── Event Bindings ────────────────────────────
function bindEvents() {
  const area    = document.getElementById('uploadArea');
  const inp     = document.getElementById('fileInput');

  document.getElementById('uploadBtn').addEventListener('click', () => inp.click());
  inp.addEventListener('change', e => e.target.files[0] && handleFile(e.target.files[0]));
  area.addEventListener('dragover',  e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById('removeFile').addEventListener('click', clearFile);
  document.getElementById('roastBtn').addEventListener('click', runAnalysis);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  document.getElementById('settingsOverlay').addEventListener('click', closeSettings);
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('analyzeAnother').addEventListener('click', resetUI);
  document.getElementById('copyReport').addEventListener('click', copyReport);
  document.querySelectorAll('.tab').forEach(t =>
    t.addEventListener('click', () => switchTab(t.dataset.tab))
  );
  document.querySelectorAll('.field-btn:not(.exp-btn)').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.field-btn:not(.exp-btn)').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    })
  );
  document.querySelectorAll('.exp-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.exp-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    })
  );
}

// ── Settings Drawer ───────────────────────────
function openSettings() {
  document.getElementById('settingsPanel').classList.add('open');
  document.getElementById('settingsOverlay').classList.add('open');
}
function closeSettings() {
  document.getElementById('settingsPanel').classList.remove('open');
  document.getElementById('settingsOverlay').classList.remove('open');
}

// ── File Handling ─────────────────────────────
function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf','docx'].includes(ext)) { showError('Only PDF or DOCX files are accepted.'); return; }
  if (file.size > CONFIG.MAX_SIZE)   { showError('File must be under 5 MB.'); return; }
  hideError();
  selectedFile = file;
  document.getElementById('uploadContent').style.display = 'none';
  document.getElementById('fileInfo').style.display = 'flex';
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = fmtSize(file.size);
  document.getElementById('roastBtn').disabled = false;
}
function clearFile() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('uploadContent').style.display = 'flex';
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('roastBtn').disabled = true;
}
function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

// ── Error Banner ──────────────────────────────
function showError(msg) {
  const el = document.getElementById('errorBanner');
  el.textContent = '⚠️ ' + msg; el.style.display = 'block';
}
function hideError() { document.getElementById('errorBanner').style.display = 'none'; }

// ── Toast ─────────────────────────────────────
function toast(msg, ms = 3000) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ── Main Analysis ─────────────────────────────
async function runAnalysis() {
  if (!selectedFile) return;
  document.getElementById('uploadArea').closest('section').style.display = 'none';
  document.getElementById('how-it-works').style.display = 'none';
  show('loadingSection');

  try {
    setStep('parse','active'); setProgress(5);
    resumeText = await parseResume(selectedFile);
    if (!resumeText || resumeText.trim().length < 30) throw new Error('Could not extract enough text from the file.');
    setStep('parse','done'); setProgress(20);

    setStep('skills','active');
    const selectedDomain = document.querySelector('.field-btn:not(.exp-btn).active')?.dataset.field || 'auto';
    const expLevel = document.querySelector('.exp-btn.active')?.dataset.exp || 'fresher';
    const domain = selectedDomain === 'auto' ? detectDomain(resumeText) : selectedDomain;
    const skills = analyzeSkills(resumeText, domain);
    skills.expLevel = expLevel;
    setStep('skills','done'); setProgress(40);

    setStep('ats','active');
    const ats = calcATS(resumeText, skills, expLevel);
    setStep('ats','done'); setProgress(58);

    setStep('grammar','active');
    const grammar = checkGrammar(resumeText);
    setStep('grammar','done'); setProgress(72);

    setStep('roast','active');
    setTip('Asking the AI to prepare its roasting equipment…');
    const roast = await generateRoast(resumeText, ats, skills, grammar);
    setStep('roast','done'); setProgress(100);

    await delay(600);
    renderResults({ skills, ats, grammar, roast });
    hide('loadingSection');
    show('resultsSection');
  } catch (err) {
    hide('loadingSection');
    resetUI();
    showError('Analysis failed: ' + err.message);
    show('upload');
    show('how-it-works');
  }
}

function show(id) { document.getElementById(id).style.display = ''; }
function hide(id) { document.getElementById(id).style.display = 'none'; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Loading Steps ─────────────────────────────
function setStep(id, state) {
  const el = document.getElementById('step-' + id);
  el.className = 'lstep ' + state;
}
function setProgress(pct) {
  document.getElementById('loadingBar').style.width = pct + '%';
}
const tips = [
  'Scanning for buzzwords you definitely stole from LinkedIn…',
  'Counting how many times you said "passionate"…',
  'Checking if your skills are real or just aspirational…',
  'Measuring the gap between your experience and your ego…',
  'Calibrating sarcasm levels…'
];
let tipIdx = 0;
function setTip(msg) {
  document.getElementById('loadingTip').textContent = msg || tips[tipIdx++ % tips.length];
}

// ── Resume Parsing ────────────────────────────
async function parseResume(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return ext === 'pdf' ? parsePDF(file) : parseDOCX(file);
}

async function parsePDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(s => s.str).join(' ') + '\n';
  }
  return text;
}

async function parseDOCX(file) {
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value;
}

// ── Multi-Domain Skill Data ───────────────────
const DOMAIN_DATA = {
  tech: {
    label:'Software / IT', icon:'💻',
    skills:['python','java','javascript','typescript','c++','c#','ruby','php','swift','kotlin','go','rust','scala','react','angular','vue','nextjs','nodejs','express','django','flask','spring','laravel','fastapi','sql','mysql','postgresql','mongodb','redis','firebase','dynamodb','aws','azure','gcp','docker','kubernetes','terraform','ansible','jenkins','html','css','sass','graphql','rest api','git','linux','bash','agile','scrum','jira','figma','pandas','numpy','tensorflow','pytorch','machine learning','deep learning','nlp','devops','ci/cd','elasticsearch','kafka','spark'],
    common:['python','javascript','sql','react','aws','git','docker','communication','project management']
  },
  engineering: {
    label:'Engineering', icon:'⚙️',
    skills:['autocad','solidworks','matlab','ansys','catia','revit','plc','scada','cad','cam','fea','cfd','six sigma','lean manufacturing','quality control','welding','hydraulics','pneumatics','thermodynamics','structural analysis','civil engineering','mechanical design','electrical engineering','circuit design','pcb','embedded systems','arduino','hvac','piping','iso','project management','blueprint','site inspection','surveying','construction','manufacturing','tolerancing','gd&t'],
    common:['autocad','matlab','project management','quality control','solidworks','cad','iso']
  },
  medical: {
    label:'Medical / Healthcare', icon:'🏥',
    skills:['patient care','clinical','diagnosis','treatment','surgery','anatomy','pharmacology','medical imaging','ecg','icu','emergency care','patient assessment','nursing','radiology','pathology','pediatrics','cardiology','neurology','oncology','psychiatric','rehabilitation','vital signs','electronic health records','ehr','cpr','first aid','infection control','sterilization','medical terminology','clinical trials','hipaa','icd-10','pharmacist','mbbs','md','bds','physiotherapy','dietitian'],
    common:['patient care','clinical','pharmacology','diagnosis','first aid','ehr','medical terminology']
  },
  aviation: {
    label:'Aviation', icon:'✈️',
    skills:['atpl','cpl','ppl','instrument rating','ifr','vfr','multi-engine','type rating','flight operations','air traffic control','atc','navigation','avionics','aircraft maintenance','faa','dgca','icao','iata','safety management','crew resource management','crm','meteorology','aerodynamics','flight planning','weight and balance','standard operating procedures','dispatch','ground operations','cargo handling','cabin crew','emergency procedures','radio communication','logbook','ame','pirep'],
    common:['instrument rating','ifr','crew resource management','safety procedures','navigation','flight planning']
  },
  business: {
    label:'Business / Finance', icon:'💼',
    skills:['financial analysis','accounting','excel','powerpoint','financial modeling','budgeting','forecasting','audit','taxation','erp','sap','quickbooks','tally','balance sheet','cash flow','investment','portfolio management','risk management','compliance','kpi','business analysis','market research','supply chain','logistics','procurement','operations management','corporate finance','equity','banking','credit analysis','ifrs','gaap','cost accounting','variance analysis'],
    common:['excel','financial analysis','accounting','budgeting','erp','audit','communication']
  },
  law: {
    label:'Law / Legal', icon:'⚖️',
    skills:['legal research','litigation','contract law','corporate law','drafting','pleading','legal writing','due diligence','compliance','intellectual property','criminal law','civil law','family law','labor law','taxation law','arbitration','negotiation','court proceedings','case management','legal analysis','statutes','client counseling','regulatory compliance','mergers','property law','constitutional law','tort','evidence','llb','llm','bar exam'],
    common:['legal research','contract drafting','litigation','compliance','due diligence','legal writing','negotiation']
  },
  education: {
    label:'Education / Teaching', icon:'📚',
    skills:['curriculum development','lesson planning','classroom management','pedagogy','assessment','student evaluation','e-learning','lms','moodle','google classroom','special education','differentiated instruction','educational technology','counseling','mentoring','academic writing','behavior management','inclusive education','stem','phonics','bloom taxonomy','teacher training','instructional design','tutoring','examination','b.ed','m.ed','ctet','teaching methodology'],
    common:['curriculum development','lesson planning','classroom management','student assessment','e-learning','communication']
  },
  marketing: {
    label:'Marketing / Media', icon:'📱',
    skills:['seo','sem','ppc','google analytics','social media','content marketing','email marketing','copywriting','brand management','market research','digital marketing','facebook ads','instagram','linkedin marketing','tiktok','influencer marketing','crm','hubspot','salesforce','campaign management','a/b testing','conversion optimization','adobe creative suite','photoshop','illustrator','video editing','pr','public relations','media planning','affiliate marketing','analytics','growth hacking'],
    common:['seo','social media','content marketing','google analytics','digital marketing','email marketing','communication']
  },
  science: {
    label:'Science / Research', icon:'🔬',
    skills:['research methodology','data analysis','laboratory','spss','statistics','hypothesis testing','peer review','technical writing','grant writing','bioinformatics','genomics','chemistry','biology','physics','environmental science','spectroscopy','microscopy','pcr','cell culture','clinical research','literature review','experimental design','data visualization','matlab','scientific computing','r','python','gel electrophoresis','titration','chromatography','field research','sampling'],
    common:['research methodology','data analysis','laboratory','statistics','technical writing','r','python']
  }
};

const SOFT_SKILLS_ALL = ['leadership','communication','teamwork','problem solving','critical thinking','time management','adaptability','creativity','collaboration','project management','attention to detail','analytical','self-motivated','organized','multitasking','presentation','empathy','negotiation','decision making','stress management'];

// ── Domain Detection ──────────────────────────
function detectDomain(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [key, data] of Object.entries(DOMAIN_DATA)) {
    scores[key] = data.skills.filter(s => lower.includes(s)).length;
  }
  const top = Object.entries(scores).sort(([,a],[,b]) => b-a)[0];
  return (top && top[1] > 0) ? top[0] : 'tech';
}

// ── Skill Analysis (domain-aware) ─────────────
function analyzeSkills(text, domain) {
  const lower = text.toLowerCase();
  const dData = DOMAIN_DATA[domain] || DOMAIN_DATA.tech;
  const found   = dData.skills.filter(s => lower.includes(s));
  const soft    = SOFT_SKILLS_ALL.filter(s => lower.includes(s));
  const missing = dData.common.filter(s => !lower.includes(s));
  return { tech: found, soft, missing, domain, domainLabel: dData.label, domainIcon: dData.icon };
}

// ── ATS Scoring ───────────────────────────────
function calcATS(text, skills, expLevel = 'fresher') {
  const lower = text.toLowerCase();
  const factors = [];
  let total = 0;

  // Keywords (30 pts)
  const kwScore = Math.min(30, skills.tech.length * 2 + skills.soft.length);
  factors.push({ label:'Keyword Density', score: kwScore, max: 30, desc: `${skills.tech.length} tech + ${skills.soft.length} soft skills found` });
  total += kwScore;

  // Sections (25 pts)
  const sections = ['experience','education','skills','summary','objective','projects','certifications'];
  const found = sections.filter(s => lower.includes(s));
  const secScore = Math.min(25, found.length * 4);
  factors.push({ label:'Resume Sections', score: secScore, max: 25, desc: `Sections detected: ${found.join(', ') || 'none'}` });
  total += secScore;

  // Bullet points (15 pts)
  const bullets = (text.match(/[•\-\*]\s+\w/g) || []).length;
  const bulletScore = Math.min(15, bullets * 2);
  factors.push({ label:'Bullet Points', score: bulletScore, max: 15, desc: `${bullets} bullet points found` });
  total += bulletScore;

  // Contact info (15 pts)
  const hasEmail = /\S+@\S+\.\S+/.test(text);
  const hasPhone = /(\+?\d[\d\s\-]{8,14}\d)/.test(text);
  const hasLink  = /(linkedin|github|portfolio)/i.test(text);
  const contactScore = (hasEmail ? 6 : 0) + (hasPhone ? 5 : 0) + (hasLink ? 4 : 0);
  factors.push({ label:'Contact Info', score: contactScore, max: 15, desc: `Email:${hasEmail?'✓':'✗'}  Phone:${hasPhone?'✓':'✗'}  Links:${hasLink?'✓':'✗'}` });
  total += contactScore;

  // Word count (15 pts)
  const words = text.split(/\s+/).filter(Boolean).length;
  const wcScore = words < 150 ? 3 : words < 300 ? 8 : words < 600 ? 13 : 15;
  factors.push({ label:'Content Length', score: wcScore, max: 15, desc: `${words} words` });
  total += wcScore;

  // Adjust expectations by experience level
  const EXP_LABEL = { fresher:'Fresher', entry:'Entry Level', mid:'Mid-Level', experienced:'Experienced', senior:'Senior' };
  const expBonus = { fresher: 5, entry: 3, mid: 0, experienced: -3, senior: -6 }[expLevel] || 0;
  const adjusted = Math.min(100, Math.round(total) + expBonus);

  return { totalScore: adjusted, rawScore: Math.round(total), factors, hasEmail, hasPhone, hasLink, wordCount: words, expLevel, expLabel: EXP_LABEL[expLevel] || expLevel };
}

// ── Grammar / Quality Check ───────────────────
function checkGrammar(text) {
  const issues = [];
  const lower  = text.toLowerCase();

  const weakPhrases = ['responsible for','worked on','helped with','assisted in','did various','handled many','was involved in','i am a','i have experience'];
  weakPhrases.forEach(p => {
    if (lower.includes(p))
      issues.push({ icon:'⚠️', title:'Weak phrasing', desc:`"${p}" detected — replace with strong action verbs (e.g., "Engineered", "Led", "Delivered").` });
  });

  if (!(/(increased|decreased|reduced|improved|grew|achieved|delivered|generated).{1,60}(\d+%|\d+x|\$[\d,]+)/i.test(text)))
    issues.push({ icon:'📉', title:'No quantifiable achievements', desc:'Add numbers, percentages, or dollar figures to your accomplishments (e.g., "Reduced load time by 40%").' });

  if (lower.includes('objective') && !lower.includes('summary'))
    issues.push({ icon:'📝', title:'Old-style Objective section', desc:'Modern resumes use a "Professional Summary" instead of an Objective.' });

  const wordCount = text.split(/\s+/).length;
  if (wordCount < 200)
    issues.push({ icon:'📏', title:'Resume too short', desc:`Only ${wordCount} words detected. Aim for 400–700 words for a strong ATS hit.` });
  if (wordCount > 900)
    issues.push({ icon:'📚', title:'Resume too long', desc:`${wordCount} words is excessive for most roles. Keep it to 1–2 pages.` });

  if ((text.match(/!/g) || []).length > 3)
    issues.push({ icon:'❗', title:'Overuse of exclamation marks', desc:'Professional resumes rarely use exclamation marks.' });

  return { issues, wordCount };
}

// ── Roast Generation ──────────────────────────
async function generateRoast(text, ats, skills, grammar) {
  if (!CONFIG.HF_TOKEN) return offlineRoast(ats, skills, grammar);
  try {
    const snippet  = text.slice(0, 1200).replace(/\s+/g,' ');
    const field    = skills.domainLabel || 'Professional';
    const expLabel = skills.expLevel ? EXP_META[skills.expLevel]?.label || skills.expLevel : 'Professional';
    const tone     = EXP_META[skills.expLevel]?.tone || 'balanced';
    const prompt   = `<s>[INST] You are a savage but helpful AI resume roaster specializing in ${field} resumes for ${expLabel} candidates. Roast tone should be ${tone}. Given the resume snippet below, write EXACTLY 5 numbered roast comments and then 5 improvement tips tailored for a ${expLabel} in ${field}. Format: first "ROASTS:" then list 1-5, then "TIPS:" then list 1-5. Keep each roast under 2 sentences. Resume:\n\n${snippet} [/INST]`;

    const res = await fetch(`https://api-inference.huggingface.co/models/${CONFIG.HF_MODEL}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.HF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 700, temperature: 0.85, return_full_text: false } })
    });

    if (!res.ok) throw new Error('HF API error ' + res.status);
    const data = await res.json();
    const raw  = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
    if (!raw) throw new Error('Empty response');
    return parseAIResponse(raw);
  } catch (e) {
    console.warn('HF API failed, using offline roast:', e.message);
    return offlineRoast(ats, skills, grammar);
  }
}

function parseAIResponse(raw) {
  const roasts = [], tips = [];
  const roastMatch = raw.match(/ROASTS?:([\s\S]*?)(?:TIPS?:|$)/i);
  const tipMatch   = raw.match(/TIPS?:([\s\S]*?)$/i);

  const extractLines = str => (str || '').split('\n')
    .map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(l => l.length > 10);

  const r = extractLines(roastMatch?.[1]);
  const t = extractLines(tipMatch?.[1]);
  roasts.push(...r.slice(0,5));
  tips.push(...t.slice(0,5));

  if (roasts.length === 0) roasts.push(...offlineRoast({totalScore:50},{tech:[],soft:[]},{issues:[]}).roasts);
  if (tips.length   === 0) tips.push(...offlineRoast({totalScore:50},{tech:[],soft:[]},{issues:[]}).tips);
  return { roasts, tips, source: 'ai' };
}

// ── Experience Level Meta ────────────────────
const EXP_META = {
  fresher:    { label:'Fresher',           tone:'encouraging but honest', yearsHint:'0 years' },
  entry:      { label:'Entry Level',       tone:'constructive with humor', yearsHint:'0-2 years' },
  mid:        { label:'Mid-Level',         tone:'balanced and sharp',      yearsHint:'2-5 years' },
  experienced:{ label:'Experienced',       tone:'blunt and no-nonsense',   yearsHint:'5-10 years' },
  senior:     { label:'Senior / Expert',   tone:'ruthlessly honest',       yearsHint:'10+ years' }
};

const EXP_ROASTS = {
  fresher:    [
    'Relax — everyone starts somewhere. Your resume is adorably optimistic.',
    'You listed "Microsoft Word" as a skill. That\'s like listing "breathing" as a hobby.',
    'Your objective section reads like a wish list, not a value statement.'
  ],
  entry:      [
    'Two years in and your resume still looks like a college application.',
    'Your internship experience is doing a lot of heavy lifting here.',
    '"Eager to learn" is entry-level code for "I don\'t know much yet." Prove otherwise.'
  ],
  mid:        [
    'By now you should have numbers — where are the results?',
    'Mid-level with entry-level bullet points. Bold strategy.',
    'You\'ve had enough time to build real achievements. Time to show them.'
  ],
  experienced:[
    'With 5+ years you should be leading things, not just "assisting" them.',
    'Your resume reads like a job description, not an achievement list.',
    'Decade of experience, zero metrics. That\'s a crime in any industry.'
  ],
  senior:     [
    'Senior professional, junior resume. The irony is not lost on anyone.',
    'With 10+ years, "responsible for" should have been exiled from your vocabulary by now.',
    'Recruiters expect gravitas at your level. This resume has the gravity of a Post-it note.'
  ]
};

const EXP_TIPS = {
  fresher:    [
    'Replace the Objective with a 3-line Summary highlighting your degree, key skills, and career goal.',
    'Add academic projects, hackathons, competitions, or internships — anything real.',
    'Include your CGPA only if it\'s above 7.5 / 3.5 GPA.'
  ],
  entry:      [
    'Lead with your strongest internship or project achievement as bullet #1.',
    'Add any freelance or side projects — they count as real experience.',
    'Get certifications in your domain (AWS, PMP, Google Analytics, etc.) to stand out.'
  ],
  mid:        [
    'Every bullet should have a result: "Reduced X by Y%" or "Delivered Z on time/budget."',
    'Show progression — promotions, scope increases, or expanding responsibilities.',
    'Remove irrelevant early-career roles that no longer add value.'
  ],
  experienced:[
    'Showcase leadership: teams led, budgets managed, decisions owned.',
    'Add a "Key Achievements" section separate from job duties.',
    'Compress early career into 1-2 lines per role; focus depth on recent 5 years.'
  ],
  senior:     [
    'Your summary should read like an executive brief — impact, scale, leadership.',
    'Board-level visibility matters: speaking engagements, publications, advisory roles.',
    'Remove anything older than 15 years unless it\'s a landmark achievement.'
  ]
};

const DOMAIN_ROASTS = {
  tech:        ['Your GitHub is probably emptier than your "10 years of experience" claim.',
                'You listed React, Vue, AND Angular. Pick a side — you\'re not Switzerland.'],
  engineering: ['"Proficient in AutoCAD" — does that mean you can open it without crashing?',
                'Your project section lists one group project from university. Bold choice calling that "industry experience".'],
  medical:     ['"Patient care" is listed as a skill — hopefully it\'s not your only one.',
                'Your resume needs CPR more urgently than some of your patients.'],
  aviation:    ['Your resume has more turbulence than your flight path.',
                '"Good situational awareness" — you may want to be aware your resume is missing half its sections.'],
  business:    ['Your "financial analysis" skills are as vague as your profit margin.',
                'MBA listed but zero quantifiable business outcomes — that degree is doing heavy lifting for free.'],
  law:         ['Your legal writing is so passive, even your verbs need representation.',
                'You listed "attention to detail" but misspelled your own job title. Case dismissed.'],
  education:   ['Your resume reads like a lesson plan written the night before class.',
                '"Passionate about education" — every teacher says that. Show it, don\'t just type it.'],
  marketing:   ['Your resume isn\'t even optimized for one recruiter, let alone an ATS.',
                'You manage social media campaigns but your resume has zero engagement hook. Ironic.'],
  science:     ['Your research section is less detailed than your methodology section should be.',
                '"Strong analytical skills" — then why does this resume not pass basic formatting analysis?']
};

function offlineRoast(ats, skills, grammar) {
  const score  = ats.totalScore;
  const domain = skills.domain || 'tech';
  const exp    = skills.expLevel || 'fresher';
  const roasts = [];
  const tips   = [];

  // Score roast
  if (score < 35)  roasts.push('This resume scores lower than a blank page — at least a blank page saves the recruiter\'s time.');
  else if (score < 55) roasts.push('Your ATS score is so average it could file its own taxes as "head of household: mediocrity."');
  else if (score < 75) roasts.push('Not bad — your resume is like a participation trophy. You showed up, but nobody\'s framing it.');
  else roasts.push('Solid score! Your resume is the overachiever of the class — still, let\'s find those edges to sharpen.');

  // Experience-level roasts
  const er = EXP_ROASTS[exp] || EXP_ROASTS.fresher;
  roasts.push(er[0]);

  // Domain-specific roasts
  const dr = DOMAIN_ROASTS[domain] || DOMAIN_ROASTS.tech;
  roasts.push(dr[0]);

  // Skill roasts
  if (skills.tech.length < 3) roasts.push(`You have fewer ${skills.domainLabel || 'domain'} skills listed than a student intern. Even the intern has a LinkedIn.`);

  // Grammar roasts
  if (grammar.issues.some(i => i.title.includes('Weak phrasing')))
    roasts.push('"Responsible for" — were you responsible for it, or did you just watch it happen from across the office?');
  if (grammar.issues.some(i => i.title.includes('quantifiable')))
    roasts.push('No numbers anywhere. "Improved things" — improved them from what, chaos to mild disorder?');

  // Domain-specific tips
  const DOMAIN_TIPS = {
    tech:        ['Add your GitHub link — recruiters want to see real code, not just claims.',
                  'List specific frameworks and versions (e.g., React 18, Node 20).'],
    engineering: ['Include specific project outcomes with measurable results (e.g., reduced material cost by 15%).',
                  'List your relevant certifications (PE, PMP, Six Sigma belt).'],
    medical:     ['Include clinical hours, rotations, and departments worked in.',
                  'Mention specific EMR/EHR systems you\'ve used (Epic, Cerner, etc.).'],
    aviation:    ['List total flight hours, aircraft types, and ratings clearly near the top.',
                  'Include your license number and issuing authority (FAA/DGCA/EASA).'],
    business:    ['Quantify every achievement: revenue generated, costs cut, % growth.',
                  'List ERP and financial software you\'ve used (SAP, Oracle, QuickBooks).'],
    law:         ['Mention specific cases handled (by type, not name) and their outcomes.',
                  'List bar affiliations, practice areas, and jurisdictions clearly.'],
    education:   ['List specific subjects taught, grade levels, and student outcomes.',
                  'Include any curriculum development or e-learning tools you\'ve used.'],
    marketing:   ['Add campaign ROI numbers, follower growth %, and ad spend managed.',
                  'List specific platforms and tools (HubSpot, Google Ads, Meta Business Suite).'],
    science:     ['List publications, conferences, and grants with proper citations.',
                  'Include specific lab techniques, instruments, and software used.']
  };
  // Experience-level tips first (most relevant)
  tips.push(...(EXP_TIPS[exp] || EXP_TIPS.fresher).slice(0,2));
  // Then domain tips
  tips.push(...(DOMAIN_TIPS[domain] || DOMAIN_TIPS.tech).slice(0,2));
  tips.push('Tailor resume keywords to each job description for better ATS ranking.');

  return { roasts: roasts.slice(0,5), tips: tips.slice(0,5), source: 'offline' };
}

// ── Render Results ────────────────────────────
function renderResults({ skills, ats, grammar, roast }) {
  renderScore(ats);
  renderSkills(skills);
  renderATS(ats);
  renderGrammar(grammar);
  renderRoast(roast);
  renderTips(roast.tips);
}

function renderScore(ats) {
  const s  = ats.totalScore;
  const el = document.getElementById('scoreNumber');
  const circumference = 502.65;
  const offset = circumference - (s / 100) * circumference;

  // Color ring by score
  const ring = document.getElementById('scoreRing');
  ring.style.stroke = s >= 70 ? '#22c55e' : s >= 45 ? '#f59e0b' : '#ef4444';

  // Animate number
  let cur = 0;
  const step = () => {
    cur = Math.min(cur + 2, s);
    el.textContent = cur;
    if (cur < s) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);

  // Verdict
  const verdicts = [
    [80,'🏆 Excellent! ATS-ready resume.','#22c55e'],
    [60,'👍 Good — a few tweaks needed.','#f59e0b'],
    [40,'⚠️ Needs improvement.','#f97316'],
    [0,'🔥 Back to the drawing board!','#ef4444']
  ];
  const [,label,color] = verdicts.find(([min]) => s >= min);
  const vEl = document.getElementById('scoreVerdict');
  vEl.textContent = label; vEl.style.color = color;

  // Breakdown bars
  const cont = document.getElementById('breakdownItems');
  cont.innerHTML = '';
  ats.factors.forEach(f => {
    const pct = Math.round((f.score / f.max) * 100);
    const clr = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
    cont.innerHTML += `
      <div class="breakdown-item">
        <span>${f.label}</span>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:0%;background:${clr}" data-w="${pct}"></div></div>
        <span class="breakdown-score">${f.score}/${f.max}</span>
      </div>`;
  });
  setTimeout(() => {
    cont.querySelectorAll('.breakdown-bar').forEach(b => { b.style.width = b.dataset.w + '%'; });
  }, 200);
}

function renderSkills(skills) {
  // Update section label to match detected domain
  const techGroup = document.getElementById('skillsTechGroup');
  techGroup.querySelector('h3').textContent = `${skills.domainIcon || '🛠️'} ${skills.domainLabel || 'Domain'} Skills Detected`;

  const make = (id, list, cls) => {
    const el = document.getElementById(id);
    el.innerHTML = list.length
      ? list.map((s,i) => `<span class="skill-tag ${cls}" style="animation-delay:${i*40}ms">${s}</span>`).join('')
      : '<span style="color:var(--text-muted);font-size:.85rem">None detected</span>';
  };
  make('tagsTech',    skills.tech,    'tag-tech');
  make('tagsSoft',    skills.soft,    'tag-soft');
  make('tagsMissing', skills.missing, 'tag-missing');

  // Show detected domain + exp badges in results
  const existingBadge = document.getElementById('domainBadge');
  if (existingBadge) existingBadge.remove();
  const expMeta = EXP_META[skills.expLevel] || {};
  const badge = document.createElement('div');
  badge.id = 'domainBadge';
  badge.className = 'domain-badge';
  badge.innerHTML = `${skills.domainIcon} <strong>${skills.domainLabel}</strong>&nbsp;&nbsp;·&nbsp;&nbsp;${expMeta.label || skills.expLevel || 'Fresher'}`;
  document.querySelector('.results-title').insertAdjacentElement('afterend', badge);
}

function renderATS(ats) {
  const el = document.getElementById('atsContent');
  el.innerHTML = ats.factors.map(f => {
    const pct = Math.round((f.score / f.max)*100);
    const clr = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
    const ico = pct >= 70 ? '✅' : pct >= 40 ? '⚠️' : '❌';
    return `<div class="ats-factor">
      <div class="ats-status">${ico}</div>
      <div style="flex:1"><div class="ats-label">${f.label}</div><div class="ats-desc">${f.desc}</div></div>
      <div class="ats-factor-bar"><div class="ats-factor-fill" style="width:${pct}%;background:${clr}"></div></div>
    </div>`;
  }).join('');
}

function renderGrammar(grammar) {
  const el = document.getElementById('grammarContent');
  if (grammar.issues.length === 0) {
    el.innerHTML = '<div class="grammar-good">✅ Great — no major grammar or quality issues detected!</div>';
    return;
  }
  el.innerHTML = grammar.issues.map(i => `
    <div class="grammar-issue">
      <div class="grammar-icon">${i.icon}</div>
      <div class="grammar-text"><strong>${i.title}</strong><span>${i.desc}</span></div>
    </div>`).join('');
}

function renderRoast(roast) {
  const el = document.getElementById('roastContent');
  el.innerHTML = roast.roasts.map((r,i) => `
    <div class="roast-card" style="animation-delay:${i*120}ms">
      <div class="roast-num">Roast #${i+1} ${roast.source==='ai'?'🤖':'🎭'}</div>
      <div class="roast-text">${r}</div>
    </div>`).join('');
}

function renderTips(tips) {
  const el = document.getElementById('tipsContent');
  el.innerHTML = tips.map((t,i) => `
    <div class="tip-card" style="animation-delay:${i*80}ms">
      <div class="tip-icon">💡</div>
      <div class="tip-text"><strong>Tip ${i+1}</strong><span>${t}</span></div>
    </div>`).join('');
}

// ── Tab Switching ─────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
    t.setAttribute('aria-selected', t.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + name);
  });
}

// ── Copy Report ───────────────────────────────
function copyReport() {
  const lines = [
    '=== AI RESUME ROASTER REPORT ===',
    `ATS Score: ${document.getElementById('scoreNumber').textContent}/100`,
    '',
    '-- ROAST --',
    ...Array.from(document.querySelectorAll('.roast-text')).map((e,i) => `${i+1}. ${e.textContent}`),
    '',
    '-- IMPROVEMENT TIPS --',
    ...Array.from(document.querySelectorAll('.tip-text span')).map((e,i) => `${i+1}. ${e.textContent}`)
  ];
  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => toast('📋 Report copied to clipboard!'))
    .catch(() => toast('❌ Copy failed — please select and copy manually.'));
}

// ── Reset ─────────────────────────────────────
function resetUI() {
  hide('resultsSection');
  hide('loadingSection');
  document.querySelector('.hero').style.display = '';
  document.getElementById('how-it-works').style.display = '';
  clearFile();
  hideError();
  setProgress(0);
  ['parse','skills','ats','grammar','roast'].forEach(s => setStep(s,''));
  document.getElementById('loadingTip').textContent = 'Hang tight — the AI is judging you…';
  tipIdx = 0;
  switchTab('skills');
}
