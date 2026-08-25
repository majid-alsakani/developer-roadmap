/* Developer Roadmaps hub — bilingual catalog with local progress resume. */
let lang = localStorage.getItem("rm_lang") || "ar";
let theme = localStorage.getItem("rm_theme") || "dark";
let items = [];
let activeCategory = "";
const BASE = "./";
const L = {
  ar: {
    title: "لا تتعلم عشوائيًا. ابنِ طريقك بوضوح.",
    lead: "مسارات عملية، تقدّم محفوظ، ومصادر مختارة تساعدك على الانتقال من الفضول إلى بناء منتجات حقيقية.",
    eyebrow: "خرائط تفاعلية مجانية بالعربية والإنجليزية",
    primary: "ابدأ من الصفر →", secondary: "استكشف المسارات →",
    paths: "اختر وجهتك", pathsLead: "ابدأ بالمسار الذي يطابق هدفك، ثم تقدّم خطوة واحدة كل مرة.",
    continueTitle: "تابع من حيث توقفت", continueSaved: "تقدّمك محفوظ على هذا الجهاز.", continue: "تابع المسار →",
    search: "ابحث عن مسار… (Frontend، بايثون، الذكاء الاصطناعي)",
    all: "الكل", beginner: "مبتدئ", frontend: "واجهات", backend: "خلفيات", ai: "ذكاء اصطناعي", devops: "DevOps", data: "بيانات",
    topics: "موضوع", stages: "مراحل", start: "ابدأ المسار", easy: "مبتدئ", medium: "متوسط", advanced: "متقدم", featured: "مميز", navPaths: "المسارات", navHow: "كيف تعمل", navAbout: "عن المشروع", roadmapsLabel: "مسارات", topicsLabel: "موضوع", bilingual: "ثنائية اللغة", savedLabel: "تحفظ تقدمك", howEyebrow: "كيف تعمل", howTitle: "تعلم واضح. تقدّم قابل للقياس.", howText: "اختر مسارًا، افتح الموضوع، وحدد حالته. يحفظ الموقع تقدمك محليًا على جهازك، وتبقى المصادر مجانية وقابلة للمراجعة.", aboutEyebrow: "صنعه ماجد السكني", aboutTitle: "أدوات تعلم مفيدة من اليمن إلى العالم.", aboutText: "خرائط عملية بالعربية والإنجليزية تساعد المطورين على بناء أساس قوي، وفهم الصورة الكبيرة، واختيار الخطوة التالية بثقة.", routeLabel: "تابع من حيث توقفت", routeTitle: "مهندس الذكاء الاصطناعي والوكلاء", routeMeta: "45 موضوع · 8 مراحل", pillText: "مسارات عملية<br/>من الصفر إلى الإنتاج"
  },
  en: {
    title: "Don't learn randomly. Build your path with clarity.",
    lead: "Practical paths, saved progress, and curated resources that take you from curiosity to building real products.",
    eyebrow: "Free interactive roadmaps in Arabic and English",
    primary: "Start from zero →", secondary: "Explore roadmaps →",
    paths: "Choose your destination", pathsLead: "Start with the path that matches your goal, then move one clear step at a time.",
    continueTitle: "Continue where you left off", continueSaved: "Your progress is saved on this device.", continue: "Continue path →",
    search: "Search a path… (Frontend, Python, AI)",
    all: "All", beginner: "Beginner", frontend: "Frontend", backend: "Backend", ai: "AI", devops: "DevOps", data: "Data",
    topics: "topics", stages: "stages", start: "Start path", easy: "Beginner", medium: "Intermediate", advanced: "Advanced", featured: "Featured", navPaths: "Roadmaps", navHow: "How it works", navAbout: "About the project", roadmapsLabel: "roadmaps", topicsLabel: "topics", bilingual: "Bilingual", savedLabel: "Progress saved", howEyebrow: "How it works", howTitle: "Clear learning. Measurable progress.", howText: "Choose a path, open a topic, and set its state. Your progress is saved locally on this device, while the resources stay free and reviewable.", aboutEyebrow: "Made by Majid Al-Sakani", aboutTitle: "Useful learning tools from Yemen to the world.", aboutText: "Practical Arabic and English roadmaps that help developers build strong foundations, see the big picture, and choose the next step with confidence.", routeLabel: "Continue where you left off", routeTitle: "AI & Agents Engineer", routeMeta: "45 topics · 8 stages", pillText: "Practical paths<br/>from zero to production"
  }
};
const categoryFor = slug => ({
  professional: "advanced", frontend: "frontend", backend: "backend", "ai-engineer": "ai", python: "beginner",
  devops: "devops", fullstack: "backend", mobile: "beginner", data: "data", android: "beginner"
}[slug] || "");
const difficultyFor = slug => ({ professional:"advanced", devops:"advanced", "ai-engineer":"advanced", backend:"medium", fullstack:"medium", data:"medium", frontend:"beginner", python:"beginner", mobile:"beginner", android:"beginner" }[slug] || "medium");
function esc(value){ return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function art(slug){
  const paths = {
    professional: '<path d="M30 118C90 110 86 42 150 59s66 79 133 29c54-40 35-86 99-72 35 8 51 30 80-4"/><g><circle cx="30" cy="118"/><circle cx="150" cy="59"/><circle cx="283" cy="88"/><circle cx="382" cy="16"/><circle cx="462" cy="12"/></g>',
    frontend: '<rect x="36" y="30" width="170" height="105" rx="8"/><rect x="224" y="30" width="140" height="105" rx="8"/><path d="M53 52h91M53 72h132M53 93h90M242 55h98M242 78h80M242 101h60"/>',
    backend: '<ellipse cx="88" cy="51" rx="42" ry="15"/><path d="M46 51v67c0 9 19 16 42 16s42-7 42-16V51M46 84c0 9 19 16 42 16s42-7 42-16"/><rect x="242" y="50" width="105" height="62" rx="8"/><path d="M176 84h66M206 69l24 15-24 15"/>',
    "ai-engineer": '<g><circle cx="216" cy="82" r="20"/><circle cx="86" cy="33" r="13"/><circle cx="86" cy="132" r="13"/><circle cx="350" cy="33" r="13"/><circle cx="350" cy="132" r="13"/></g><path d="M98 39 198 73M98 126l100-34M234 73l104-34M234 91l104 34"/>',
    python: '<path d="M91 115c-35 0-35-44 0-44h83c28 0 28-42 0-42H91c-26 0-26 42 0 42h65c34 0 34 44 0 44H91Z"/><path d="M122 29v86M87 53h90"/><circle cx="112" cy="48" r="4"/><circle cx="140" cy="91" r="4"/>',
    devops: '<path d="M48 118c0-56 35-88 86-88h70M392 32c51 0 86 32 86 88M48 118h430"/><circle cx="48" cy="118" r="15"/><circle cx="220" cy="30" r="15"/><circle cx="478" cy="118" r="15"/><path d="m214 24 12 6-12 6M472 112l12 6-12 6"/>',
    fullstack: '<rect x="42" y="28" width="118" height="76" rx="9"/><rect x="360" y="28" width="118" height="76" rx="9"/><path d="M160 66h200M208 66l18-12m-18 12 18 12M312 66l-18-12m18 12-18 12"/><ellipse cx="260" cy="128" rx="82" ry="24"/><path d="M212 128v22c0 14 96 14 96 0v-22M212 140c0 14 96 14 96 0"/>',
    mobile: '<rect x="202" y="12" width="116" height="136" rx="18"/><rect x="218" y="34" width="84" height="69" rx="7"/><path d="M232 52h56M232 70h43M232 88h50M236 124h48M112 80h58m140 0h58"/><circle cx="260" cy="124" r="5"/><path d="m112 80 14-10m-14 10 14 10m296-10-14-10m14 10-14 10"/>',
    data: '<path d="M42 136h436M66 118V46M66 118l84-48 78 26 94-62 96 40"/><circle cx="66" cy="118" r="9"/><circle cx="150" cy="70" r="9"/><circle cx="228" cy="96" r="9"/><circle cx="322" cy="34" r="9"/><circle cx="418" cy="74" r="9"/><path d="M98 48h72M98 64h42"/>',
    android: '<path d="M208 55c0-22 23-40 52-40s52 18 52 40v68c0 19-23 34-52 34s-52-15-52-34V55Z"/><path d="m224 30-16-18m88 18 16-18M194 82h-32m166 0h32M222 157v20m76-20v20"/><circle cx="240" cy="74" r="6"/><circle cx="280" cy="74" r="6"/><path d="M238 104h44"/>'
  };
  return `<svg viewBox="0 0 520 160" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".92">${paths[slug] || paths.professional}</g></svg>`;
}
function safeColor(value){ return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#2d8cff"; }
function progressFor(slug){
  const state = JSON.parse(localStorage.getItem("rm_progress_" + slug) || "{}");
  const done = Object.values(state).filter(v => v === "done").length;
  const learning = Object.values(state).filter(v => v === "learning").length;
  const item = items.find(i => i.slug === slug);
  const total = item?.topic_count || item?.total || item?.nodes || 0;
  return { done, learning, total, pct: total ? Math.round(done / total * 100) : 0 };
}
function shell(){
  const copy = L[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.theme = theme;
  document.getElementById("langBtn").textContent = lang === "ar" ? "English" : "العربية";
  document.getElementById("themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
  document.getElementById("h1").innerHTML = lang === "ar" ? "لا تتعلم عشوائيًا. <span class=\"accent\">ابنِ طريقك بوضوح.</span>" : "Don't learn randomly. <span class=\"accent\">Build your path with clarity.</span>";
  document.getElementById("lead").textContent = copy.lead;
  document.getElementById("eyebrow").textContent = copy.eyebrow;
  document.getElementById("primaryCta").textContent = copy.primary;
  document.getElementById("secondaryCta").textContent = copy.secondary;
  document.getElementById("pathsTitle").textContent = copy.paths;
  document.getElementById("pathsLead").textContent = copy.pathsLead;
  document.getElementById("navPaths").textContent = copy.navPaths;
  document.getElementById("navHow").textContent = copy.navHow;
  document.getElementById("navAbout").textContent = copy.navAbout;
  document.getElementById("statRoadmapsLabel").textContent = copy.roadmapsLabel;
  document.getElementById("statTopicsLabel").textContent = copy.topicsLabel;
  document.getElementById("statBilingual").textContent = copy.bilingual;
  document.getElementById("statSaved").textContent = copy.savedLabel;
  document.getElementById("howEyebrow").textContent = copy.howEyebrow;
  document.getElementById("howTitle").textContent = copy.howTitle;
  document.getElementById("howText").textContent = copy.howText;
  document.getElementById("aboutEyebrow").textContent = copy.aboutEyebrow;
  document.getElementById("aboutTitle").textContent = copy.aboutTitle;
  document.getElementById("aboutText").textContent = copy.aboutText;
  document.getElementById("routePanelLabel").textContent = copy.routeLabel;
  document.getElementById("routePanelTitle").textContent = copy.routeTitle;
  document.getElementById("routePanelMeta").textContent = copy.routeMeta;
  document.getElementById("statPillText").innerHTML = copy.pillText;
  document.getElementById("search").placeholder = copy.search;
  const labels = {"":"all", beginner:"beginner", frontend:"frontend", backend:"backend", ai:"ai", devops:"devops", data:"data"};
  document.querySelectorAll("#filters .filter").forEach(btn => { btn.textContent = copy[labels[btn.dataset.filter]]; btn.classList.toggle("active", btn.dataset.filter === activeCategory); });
  const total = items.reduce((sum, i) => sum + (i.topic_count || i.total || i.nodes || 0), 0);
  document.getElementById("statRoadmaps").textContent = items.length || 10;
  document.getElementById("statTopics").textContent = total ? `${total}+` : "400+";
  renderContinue();
}
function renderContinue(){
  const panel = document.getElementById("continuePanel");
  if (!panel || !items.length) return;
  const candidates = items.map(i => ({ item:i, p:progressFor(i.slug) })).filter(x => x.p.done || x.p.learning).sort((a,b) => (b.p.done + b.p.learning) - (a.p.done + a.p.learning));
  if (!candidates.length) { panel.classList.remove("on"); return; }
  const { item, p } = candidates[0];
  panel.classList.add("on");
  document.getElementById("continueTitle").textContent = L[lang].continueTitle;
  document.getElementById("continueText").textContent = `${lang === "ar" ? item.ar : item.en} · ${p.pct}% — ${L[lang].continueSaved}`;
  document.getElementById("continueBar").style.width = Math.max(4, p.pct) + "%";
  document.getElementById("continueBtn").textContent = L[lang].continue;
  document.getElementById("continueBtn").href = `./roadmap.html?r=${encodeURIComponent(item.slug)}`;
  const heroItem = items.find(i => i.slug === "ai-engineer") || item;
  const heroProgress = progressFor(heroItem.slug);
  document.getElementById("routePanelLabel").textContent = L[lang].routeLabel;
  document.getElementById("routePanelTitle").textContent = lang === "ar" ? heroItem.ar : heroItem.en;
  document.getElementById("routePanelMeta").textContent = `${heroItem.topic_count || heroItem.nodes} ${L[lang].topics} · ${heroItem.stage_count || heroItem.groups} ${L[lang].stages}`;
  document.getElementById("routePanelPct").textContent = heroProgress.pct + "%";
}
function draw(filter = ""){
  const f = filter.trim().toLowerCase();
  const copy = L[lang];
  document.getElementById("grid").innerHTML = items.filter(i => {
    const hay = `${i.en} ${i.ar} ${i.desc_en} ${i.desc_ar} ${i.slug}`.toLowerCase();
    return (!f || hay.includes(f)) && (!activeCategory || categoryFor(i.slug) === activeCategory);
  }).map((i, index) => {
    const difficulty = difficultyFor(i.slug);
    const feature = i.slug === "professional" ? `<span class="featured">★ ${copy.featured}</span>` : "";
    return `<a class="card ${i.slug === "professional" ? "featured-card" : ""}" href="./roadmap.html?r=${encodeURIComponent(i.slug)}"><div class="card-art art-${esc(i.slug)}" style="--card-accent:${safeColor(i.color)}">${art(i.slug)}${feature}</div><div class="card-body"><h3>${esc(lang === "ar" ? i.ar : i.en)}<span class="en-name">${esc(lang === "ar" ? i.en : i.ar)}</span></h3><p>${esc(lang === "ar" ? i.desc_ar : i.desc_en)}</p><div class="meta"><span>${i.topic_count || i.nodes} ${copy.topics} · ${i.stage_count || i.groups} ${copy.stages}</span><span class="difficulty">${copy[difficulty]}</span></div><div class="card-link">${copy.start} <span>→</span></div></div></a>`;
  }).join("") || `<p class="empty-state">${lang === "ar" ? "لا توجد مسارات مطابقة لبحثك." : "No roadmaps match your search."}</p>`;
}
document.getElementById("langBtn").addEventListener("click", () => { lang = lang === "ar" ? "en" : "ar"; localStorage.setItem("rm_lang", lang); window.dispatchEvent(new CustomEvent("rm:language-changed", { detail: { lang } })); shell(); draw(document.getElementById("search").value); });
document.getElementById("themeBtn").addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; localStorage.setItem("rm_theme", theme); shell(); });
document.getElementById("search").addEventListener("input", e => draw(e.target.value));
document.querySelectorAll("#filters .filter").forEach(btn => btn.addEventListener("click", () => { activeCategory = btn.dataset.filter; shell(); draw(document.getElementById("search").value); }));
window.addEventListener("rm:sync-applied", () => { shell(); draw(document.getElementById("search").value); });
fetch("./data/roadmaps.json").then(r => r.ok ? r.json() : Promise.reject()).catch(() => fetch("./data/index.json").then(r => r.json())).then(d => { items = d.roadmaps; shell(); draw(); }).catch(() => { document.getElementById("grid").innerHTML = `<p class="empty-state">Unable to load roadmaps.</p>`; });
