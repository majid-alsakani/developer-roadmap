/* Interactive roadmap renderer — bilingual, progress-tracking, zero dependencies. */
const T = {
  en: { back:"All roadmaps", progress:"Your progress", done:"Done", learning:"Learning", skip:"Skip", pending:"Pending",
        reset:"Reset", primary:"Core", secondary:"Recommended", optional:"Optional",
        resources:"Free resources", nores:"No links yet — contributions welcome.", close:"Close", saved:"Your progress is saved on this device.",
        of:"of", topics:"topics", markAs:"Mark this topic", share:"Copy link", quiz:"Quick quiz", testYourself:"Test yourself", quizIntro:"Check your understanding in two quick questions.", startQuiz:"Start quiz", question:"Question", checkAnswer:"Check answer", nextQuestion:"Next question", finishQuiz:"Finish quiz", correct:"Correct", incorrect:"Not quite", chooseAnswer:"Choose an answer first.", score:"Your score", bestScore:"Best score", attempts:"attempts", passed:"Passed", tryAgain:"Try again", noQuiz:"A quiz is coming for this topic.", pathQuiz:"Path check", pathQuizIntro:"A focused check built from this roadmap's topic quizzes.", pathQuizStart:"Start path check", pathQuizEmpty:"Path check will appear as more topic quizzes are added.", pathQuizResult:"Path check complete", pathQuizPassed:"Strong foundation", pathQuizRetry:"Try path check again", pathQuizNext:"Next question", topicLabel:"Topic" },
  ar: { back:"كل الخرائط", progress:"تقدّمك", done:"أنجزته", learning:"أتعلّمه", skip:"تخطّيته", pending:"لم يبدأ",
        reset:"إعادة تعيين", primary:"أساسي", secondary:"موصى به", optional:"اختياري",
        resources:"مصادر مجانية", nores:"لا توجد روابط بعد — مساهماتك مرحّب بها.", close:"إغلاق", saved:"يُحفظ تقدمك على هذا الجهاز.",
        of:"من", topics:"موضوعًا", markAs:"حدّد حالة الموضوع", share:"نسخ الرابط", quiz:"اختبار قصير", testYourself:"اختبر نفسك", quizIntro:"تحقق من فهمك في سؤالين سريعين.", startQuiz:"ابدأ الاختبار", question:"السؤال", checkAnswer:"تحقق من الإجابة", nextQuestion:"السؤال التالي", finishQuiz:"إنهاء الاختبار", correct:"إجابة صحيحة", incorrect:"ليست الإجابة الصحيحة", chooseAnswer:"اختر إجابة أولًا.", score:"نتيجتك", bestScore:"أفضل نتيجة", attempts:"محاولات", passed:"اجتاز الاختبار", tryAgain:"أعد المحاولة", noQuiz:"سيُضاف اختبار لهذا الموضوع قريبًا.", pathQuiz:"اختبار المسار", pathQuizIntro:"اختبار مركز مبني على اختبارات موضوعات هذا المسار.", pathQuizStart:"ابدأ اختبار المسار", pathQuizEmpty:"سيظهر اختبار المسار عند إضافة اختبارات إلى مزيد من موضوعاته.", pathQuizResult:"اكتمل اختبار المسار", pathQuizPassed:"أساس قوي", pathQuizRetry:"أعد اختبار المسار", pathQuizNext:"السؤال التالي", topicLabel:"الموضوع" }
};
const q = new URLSearchParams(location.search);
const slug = q.get("r") || "frontend";
let lang = localStorage.getItem("rm_lang") || "ar";
let theme = localStorage.getItem("rm_theme") || "dark";
const KEY = "rm_progress_" + slug;
let progress = JSON.parse(localStorage.getItem(KEY) || "{}");
const QUIZ_KEY = "rm_quiz_" + slug;
let quizResults = JSON.parse(localStorage.getItem(QUIZ_KEY) || "{}");
let quizSession = null;
let pathQuizSession = null;
let data = null, current = null;
let quizData = {};

function applyShell(){
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.theme = theme;
  document.getElementById("langBtn").textContent = lang === "ar" ? "English" : "العربية";
  document.getElementById("themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
}
const t = k => T[lang][k];


const AUTHOR = { name: "Majid Al-Sakani", nameAr: "ماجد السكني", url: "https://github.com/majid-alsakani" };
const SITE = "https://majid-alsakani.github.io/developer-roadmap";

function topicTotal(d){ return d.total || d.nodes || (Array.isArray(d.groups) ? d.groups.reduce((sum,g) => sum + (g.nodes || []).length, 0) : 0); }
function stageTotal(d){ return d.stageCount || (Array.isArray(d.groups) ? d.groups.length : (d.groups || 0)); }

function setMeta(sel, attr, key, content){
  let el = document.head.querySelector(`${sel}[${attr}="${key}"]`);
  if (!el){ el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

/* Per-roadmap SEO: unique title, description, canonical, OG tags and JSON-LD. */
function renderSeo(){
  const name = lang === "ar" ? data.ar : data.en;
  const alt  = lang === "ar" ? data.en : data.ar;
  const total = topicTotal(data);
  const desc = (lang === "ar" ? data.desc_ar : data.desc_en) +
    (lang === "ar" ? ` — ${total} موضوعًا بإعداد ${AUTHOR.nameAr} (${AUTHOR.name}).`
                   : ` — ${total} topics curated by ${AUTHOR.name} (${AUTHOR.nameAr}).`);
  const title = `${name} ${lang === "ar" ? "خريطة تعلّم تفاعلية" : "Roadmap"} · ${alt} | ${AUTHOR.name} ${AUTHOR.nameAr}`;
  const url = `${SITE}/roadmap.html?r=${data.slug}`;
  document.title = title;
  setMeta("meta", "name", "description", desc);
  setMeta("meta", "name", "author", `${AUTHOR.name} — ${AUTHOR.nameAr}`);
  setMeta("meta", "property", "og:title", title);
  setMeta("meta", "property", "og:description", desc);
  setMeta("meta", "property", "og:url", url);
  let can = document.head.querySelector('link[rel="canonical"]');
  if (!can){ can = document.createElement("link"); can.rel = "canonical"; document.head.appendChild(can); }
  can.href = url;

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Course", name: `${name} — ${alt}`, description: desc, inLanguage: ["ar","en"], url,
        isAccessibleForFree: true, numberOfCredits: total,
        provider: { "@type": "Person", name: AUTHOR.name, alternateName: AUTHOR.nameAr, url: AUTHOR.url },
        author:   { "@type": "Person", name: AUTHOR.name, alternateName: AUTHOR.nameAr, url: AUTHOR.url },
        hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: `PT${total * 3}H` } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "ar" ? "كل الخرائط" : "All roadmaps", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name, item: url } ] }
    ]
  };
  let s = document.getElementById("ldjson");
  if (!s){ s = document.createElement("script"); s.type = "application/ld+json"; s.id = "ldjson"; document.head.appendChild(s); }
  s.textContent = JSON.stringify(ld);
}

function heroArt(slug){
  const art = {
    professional: '<svg viewBox="0 0 520 260" fill="none"><path class="art-line" d="M32 204C93 176 78 82 154 91s74 96 146 46c58-40 55-110 124-106 34 2 49 28 66-7" stroke-width="5" stroke-linecap="round"/><g class="art-node" stroke-width="3"><circle cx="32" cy="204" r="11"/><circle cx="154" cy="91" r="11"/><circle cx="300" cy="137" r="11"/><circle cx="424" cy="31" r="11"/><circle cx="490" cy="24" r="11"/></g><path class="art-line" d="M424 31V4M490 24V0" stroke-width="2" stroke-dasharray="5 6"/></svg>',
    frontend: '<svg viewBox="0 0 520 260" fill="none"><rect class="art-node" x="32" y="34" width="204" height="150" rx="12" stroke-width="3"/><rect class="art-node" x="266" y="34" width="222" height="90" rx="12" stroke-width="3"/><path class="art-line" d="M54 69h158M54 98h108M54 128h132M290 68h150M290 96h109M302 151h92l34 28h-92z" stroke-width="4" stroke-linecap="round"/><circle class="art-node done" cx="362" cy="195" r="28" stroke-width="3"/><path class="art-line" d="m349 195 9 9 18-20" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    backend: '<svg viewBox="0 0 520 260" fill="none"><ellipse class="art-node" cx="92" cy="62" rx="55" ry="20" stroke-width="3"/><path class="art-node" d="M37 62v112c0 11 25 20 55 20s55-9 55-20V62M37 100c0 11 25 20 55 20s55-9 55-20" stroke-width="3"/><rect class="art-node" x="282" y="63" width="154" height="102" rx="14" stroke-width="3"/><path class="art-line" d="M147 113h135M214 93l31 20-31 20M313 96h92M313 126h68" stroke-width="4" stroke-linecap="round"/></svg>',
    "ai-engineer": '<svg viewBox="0 0 520 260" fill="none"><g class="art-node" stroke-width="3"><circle cx="260" cy="130" r="34"/><circle cx="90" cy="56" r="18"/><circle cx="90" cy="204" r="18"/><circle cx="430" cy="56" r="18"/><circle cx="430" cy="204" r="18"/></g><path class="art-line" d="M106 63 230 114M106 197l124-51M290 114 414 63M290 146l124 51M260 96v-68M260 164v68" stroke-width="4" stroke-linecap="round"/><circle class="art-node done" cx="260" cy="130" r="10"/></svg>',
    python: '<svg viewBox="0 0 520 260" fill="none"><path class="art-line" d="M125 188c-65 0-65-77 0-77h125c58 0 58-73 0-73H126c-48 0-48 73 0 73h112c67 0 67 77 0 77H125Z" stroke-width="8" stroke-linecap="round"/><path class="art-line" d="M178 38v150M100 76h167" stroke-width="3"/><circle class="art-node done" cx="152" cy="70" r="7"/><circle class="art-node done" cx="207" cy="151" r="7"/><path class="art-line" d="M335 188h104M387 166v44" stroke-width="4" stroke-linecap="round"/><circle class="art-node" cx="387" cy="128" r="26" stroke-width="3"/></svg>',
    devops: '<svg viewBox="0 0 520 260" fill="none"><path class="art-line" d="M75 132c0-65 45-101 108-101h75c66 0 112 36 112 101s-46 101-112 101h-75c-63 0-108-36-108-101Zm0 0h370" stroke-width="5"/><g class="art-node" stroke-width="3"><circle cx="75" cy="132" r="13"/><circle cx="258" cy="31" r="13"/><circle cx="445" cy="132" r="13"/><circle cx="258" cy="233" r="13"/></g><path class="art-line" d="m252 24 13 7-13 7M439 125l13 7-13 7" stroke-width="3"/></svg>',
    fullstack: '<svg viewBox="0 0 520 260" fill="none"><rect class="art-node" x="54" y="28" width="176" height="65" rx="12" stroke-width="3"/><rect class="art-node" x="290" y="28" width="176" height="65" rx="12" stroke-width="3"/><rect class="art-node" x="54" y="166" width="176" height="65" rx="12" stroke-width="3"/><rect class="art-node" x="290" y="166" width="176" height="65" rx="12" stroke-width="3"/><path class="art-line" d="M230 60h60M142 93v73M378 93v73M230 198h60" stroke-width="4" stroke-linecap="round"/><circle class="art-node done" cx="260" cy="60" r="9"/><circle class="art-node done" cx="260" cy="198" r="9"/></svg>',
    mobile: '<svg viewBox="0 0 520 260" fill="none"><rect class="art-node" x="178" y="16" width="164" height="228" rx="24" stroke-width="4"/><rect class="art-node" x="202" y="52" width="116" height="113" rx="10" stroke-width="3"/><path class="art-line" d="M217 82h86M217 108h65M217 134h80" stroke-width="4" stroke-linecap="round"/><circle class="art-node done" cx="260" cy="205" r="9"/><path class="art-line" d="M94 132h58M368 132h58" stroke-width="4" stroke-linecap="round"/></svg>',
    data: '<svg viewBox="0 0 520 260" fill="none"><path class="art-line" d="M48 212h420M75 184V60M75 184l80-52 72 25 91-90 89 56" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><g class="art-node done" stroke-width="3"><circle cx="75" cy="184" r="9"/><circle cx="155" cy="132" r="9"/><circle cx="227" cy="157" r="9"/><circle cx="318" cy="67" r="9"/><circle cx="407" cy="123" r="9"/></g><path class="art-line" d="M112 88h72M112 112h48" stroke-width="4" stroke-linecap="round"/></svg>',
    android: '<svg viewBox="0 0 520 260" fill="none"><rect class="art-node" x="155" y="66" width="210" height="128" rx="32" stroke-width="4"/><path class="art-line" d="M194 66 174 36M326 66l20-30M199 106h1M320 106h1M205 194v30M315 194v30M155 130h-38M365 130h38" stroke-width="5" stroke-linecap="round"/><path class="art-line" d="M211 148h98" stroke-width="4" stroke-linecap="round"/><circle class="art-node done" cx="199" cy="106" r="7"/><circle class="art-node done" cx="321" cy="106" r="7"/></svg>'
  };
  return `<div class="roadmap-art">${art[slug] || art.professional}</div>`;
}
function renderHeroTrack(){
  const hero = document.querySelector(".roadmap-hero");
  const visual = document.getElementById("heroVisual");
  if (!hero || !visual || !data) return;
  hero.dataset.track = data.slug;
  document.documentElement.style.setProperty("--road-accent", data.color || "#2d8cff");
  document.getElementById("roadKicker").textContent = lang === "ar" ? "مسار تعلّم تفاعلي" : "Interactive learning path";
  document.getElementById("heroMeta").innerHTML = `<span>${topicTotal(data)} ${lang === "ar" ? "موضوعًا" : "topics"}</span><span>${stageTotal(data)} ${lang === "ar" ? "مراحل" : "stages"}</span><span>${lang === "ar" ? "تقدم محفوظ" : "Progress saved"}</span>`;
  visual.innerHTML = heroArt(data.slug);
}
function save(){ localStorage.setItem(KEY, JSON.stringify(progress)); window.dispatchEvent(new CustomEvent("rm:progress-changed", { detail: { slug, progress } })); }

function stats(){
  const total = topicTotal(data);
  const done = Object.values(progress).filter(v => v === "done").length;
  const learning = Object.values(progress).filter(v => v === "learning").length;
  return { total, done, learning, pct: total ? Math.round(done / total * 100) : 0 };
}

function renderProgress(){
  const s = stats();
  document.getElementById("bar").style.width = s.pct + "%";
  document.getElementById("pct").textContent = s.pct + "%";
  document.getElementById("counts").textContent =
    `${s.done} ${t("of")} ${s.total} ${t("topics")} · ${t("learning")}: ${s.learning}`;
}

function render(){
  applyShell();
  renderSeo();
  renderHeroTrack();
  renderPathQuizBar();
  document.getElementById("backBtn").textContent = "← " + t("back");
  document.getElementById("h1").textContent = data.icon + " " + (lang === "ar" ? data.ar : data.en);
  document.getElementById("lead").textContent = lang === "ar" ? data.desc_ar : data.desc_en;
  document.getElementById("progLabel").textContent = t("progress");
  document.getElementById("saveNote").textContent = t("saved");
  document.getElementById("resetBtn").textContent = t("reset");
  document.getElementById("legend").innerHTML =
    [["primary","var(--primary)"],["secondary","var(--secondary)"],["optional","var(--optional)"],
     ["done","var(--done)"],["learning","var(--learn)"]]
    .map(([k,c]) => `<span><i class="dot" style="background:${c}"></i>${t(k)}</span>`).join("");

  const map = document.getElementById("map");
  map.innerHTML = data.groups.map(g => `
    <section class="group">
      <div class="gtitle">${lang === "ar" ? g.ar : g.en}</div>
      <div class="nodes">
        ${g.nodes.map(nd => {
          const st = progress[nd.id] || "";
          const mark = st === "done" ? "✔" : st === "learning" ? "◐" : st === "skip" ? "✕" : "";
          return `<button class="node ${nd.type} ${quizFor(nd).length ? "has-quiz" : ""}" data-id="${nd.id}" ${st ? `data-state="${st}"` : ""}>
            <span>${lang === "ar" ? nd.ar : nd.en}<span class="sub">${lang === "ar" ? nd.en : nd.ar}</span></span>
            ${quizFor(nd).length ? `<span class="quiz-badge" title="${t("quiz")}">Q</span>` : ""}<span class="tick">${mark}</span></button>`;
        }).join("")}
      </div>
    </section>`).join("");

  map.querySelectorAll(".node").forEach(b => b.addEventListener("click", () => openNode(b.dataset.id)));
  renderProgress();
}

function findNode(id){
  for (const g of data.groups) for (const nd of g.nodes) if (nd.id === id) return nd;
  return null;
}

function quizFor(node){
  const entry = quizData[node?.id];
  if (Array.isArray(entry)) return entry;
  if (entry && Array.isArray(entry.questions)) return entry.questions;
  return Array.isArray(node?.quiz) ? node.quiz : [];
}
function saveQuizResult(node, score){
  const old = quizResults[node.id] || { bestScore: 0, attempts: 0, passed: false };
  quizResults[node.id] = { bestScore: Math.max(old.bestScore || 0, score), attempts: (old.attempts || 0) + 1, passed: Boolean(old.passed || score >= 70), updatedAt: new Date().toISOString() };
  localStorage.setItem(QUIZ_KEY, JSON.stringify(quizResults)); window.dispatchEvent(new CustomEvent("rm:quiz-changed", { detail: { slug, results: quizResults } }));
}
function renderQuiz(node){
  const panel = document.getElementById("quizPanel");
  const content = document.getElementById("quizContent");
  const questions = quizFor(node);
  document.getElementById("quizTitle").textContent = t("quiz");
  document.getElementById("quizIntro").textContent = questions.length ? t("quizIntro") : t("noQuiz");
  panel.hidden = !questions.length;
  if (!questions.length) return;
  if (!quizSession || quizSession.nodeId !== node.id) quizSession = null;
  const result = quizResults[node.id];
  if (!quizSession){
    content.innerHTML = `<button class="btn quiz-start" id="quizStart">${t("startQuiz")}</button>${result ? `<div class="quiz-best">${t("bestScore")}: ${result.bestScore}% · ${result.attempts} ${t("attempts")}</div>` : ""}`;
    document.getElementById("quizStart").addEventListener("click", () => { quizSession = { nodeId: node.id, index: 0, answers: {}, checked: false, correct: 0 }; renderQuiz(node); });
    return;
  }
  if (quizSession.index >= questions.length){
    const score = Math.round(quizSession.correct / questions.length * 100);
    if (!quizSession.saved){ saveQuizResult(node, score); quizSession.saved = true; }
    const latest = quizResults[node.id];
    content.innerHTML = `<div class="quiz-summary"><div class="quiz-score">${score}%</div><p>${t("score")}: ${quizSession.correct} / ${questions.length}<br>${score >= 70 ? t("passed") : t("incorrect")}</p><div class="quiz-best">${t("bestScore")}: ${latest.bestScore}% · ${latest.attempts} ${t("attempts")}</div><button class="btn quiz-start" id="quizRetry">${t("tryAgain")}</button></div>`;
    document.getElementById("quizRetry").addEventListener("click", () => { quizSession = { nodeId: node.id, index: 0, answers: {}, checked: false, correct: 0 }; renderQuiz(node); });
    return;
  }
  const currentQuestion = questions[quizSession.index];
  const selected = quizSession.answers[currentQuestion.id] || "";
  const isCorrect = quizSession.checked && currentQuestion.answer.includes(selected);
  content.innerHTML = `<div class="quiz-question"><span class="quiz-count">${t("question")} ${quizSession.index + 1} / ${questions.length}</span><h5>${lang === "ar" ? currentQuestion.question_ar : currentQuestion.question_en}</h5><div class="quiz-options">${currentQuestion.options.map(option => `<label class="quiz-option ${selected === option.id ? "selected" : ""} ${quizSession.checked && currentQuestion.answer.includes(option.id) ? "correct" : ""} ${quizSession.checked && selected === option.id && !isCorrect ? "wrong" : ""}"><input type="radio" name="quizAnswer" value="${option.id}" ${selected === option.id ? "checked" : ""} ${quizSession.checked ? "disabled" : ""}><span>${lang === "ar" ? option.ar : option.en}</span></label>`).join("")}</div>${quizSession.checked ? `<div class="quiz-feedback ${isCorrect ? "correct" : "wrong"}"><strong>${isCorrect ? t("correct") : t("incorrect")}</strong><br>${lang === "ar" ? currentQuestion.explanation_ar : currentQuestion.explanation_en}</div>` : ""}<div class="quiz-actions">${quizSession.checked ? `<button class="btn" id="quizNext">${quizSession.index === questions.length - 1 ? t("finishQuiz") : t("nextQuestion")}</button>` : `<button class="btn btn-primary" id="quizCheck">${t("checkAnswer")}</button>`}</div></div>`;
  if (!quizSession.checked){
    content.querySelectorAll('input[name="quizAnswer"]').forEach(input => input.addEventListener("change", () => { quizSession.answers[currentQuestion.id] = input.value; renderQuiz(node); }));
    document.getElementById("quizCheck").addEventListener("click", () => { if (!quizSession.answers[currentQuestion.id]) { const n = document.createElement("div"); n.className = "quiz-feedback wrong"; n.textContent = t("chooseAnswer"); content.appendChild(n); return; } quizSession.checked = true; if (currentQuestion.answer.includes(quizSession.answers[currentQuestion.id])) quizSession.correct += 1; renderQuiz(node); });
  } else {
    document.getElementById("quizNext").addEventListener("click", () => { quizSession.index += 1; quizSession.checked = false; renderQuiz(node); });
  }
}

function pathQuestions(){
  if (!data) return [];
  return data.groups.flatMap(g => g.nodes || []).flatMap(node => quizFor(node).map(question => ({ question, topicId: node.id, topicName: lang === "ar" ? node.ar : node.en })));
}
function pathQuizPool(){
  const all = pathQuestions();
  const weak = all.filter(item => !quizResults[item.topicId]?.passed || (quizResults[item.topicId]?.bestScore || 0) < 70);
  const strong = all.filter(item => !weak.includes(item));
  return [...weak, ...strong].slice(0, Math.min(10, all.length));
}
function renderPathQuizBar(){
  const bar = document.getElementById("pathQuizBar");
  if (!bar) return;
  const pool = pathQuizPool();
  bar.hidden = !pool.length;
  if (!pool.length) return;
  document.getElementById("pathQuizKicker").textContent = t("pathQuiz");
  document.getElementById("pathQuizTitle").textContent = t("pathQuiz");
  document.getElementById("pathQuizText").textContent = `${t("pathQuizIntro")} ${pool.length} ${t("question")}`;
  document.getElementById("pathQuizStart").textContent = t("pathQuizStart");
}
function closePathQuiz(){ const modal = document.getElementById("pathQuizModal"); if (modal) modal.hidden = true; pathQuizSession = null; }
function renderPathQuiz(){
  const modal = document.getElementById("pathQuizModal"), content = document.getElementById("pathQuizContent");
  if (!modal || !content) return;
  const pool = pathQuizPool();
  document.getElementById("pathQuizModalKicker").textContent = t("pathQuiz");
  document.getElementById("pathQuizModalTitle").textContent = data ? (lang === "ar" ? data.ar : data.en) : t("pathQuiz");
  if (!pathQuizSession) { content.innerHTML = `<div class="path-quiz-result"><p>${t("pathQuizIntro")}</p><button class="btn btn-primary" id="pathQuizLaunch">${t("pathQuizStart")}</button></div>`; document.getElementById("pathQuizLaunch").addEventListener("click", () => { pathQuizSession = { index: 0, answers: {}, checked: false, correct: 0, pool }; renderPathQuiz(); }); return; }
  if (pathQuizSession.index >= pathQuizSession.pool.length){
    const score = Math.round(pathQuizSession.correct / pathQuizSession.pool.length * 100);
    if (!pathQuizSession.saved) { saveQuizResult({ id: "__path_quiz__" }, score); pathQuizSession.saved = true; }
    content.innerHTML = `<div class="path-quiz-result"><div class="path-quiz-result-score">${score}%</div><h3>${t("pathQuizResult")}</h3><p>${t("score")}: ${pathQuizSession.correct} / ${pathQuizSession.pool.length}<br>${score >= 70 ? t("pathQuizPassed") : t("incorrect")}</p><button class="btn btn-primary" id="pathQuizRetry">${t("pathQuizRetry")}</button></div>`;
    document.getElementById("pathQuizRetry").addEventListener("click", () => { pathQuizSession = { index: 0, answers: {}, checked: false, correct: 0, pool: pathQuizPool() }; renderPathQuiz(); }); return;
  }
  const item = pathQuizSession.pool[pathQuizSession.index], question = item.question, selected = pathQuizSession.answers[question.id] || "", isCorrect = pathQuizSession.checked && question.answer.includes(selected);
  content.innerHTML = `<div class="path-quiz-q"><span class="quiz-count">${t("question")} ${pathQuizSession.index + 1} / ${pathQuizSession.pool.length}</span><span class="path-quiz-topic">${t("topicLabel")}: ${item.topicName}</span><h3>${lang === "ar" ? question.question_ar : question.question_en}</h3><div class="path-quiz-options">${question.options.map(option => `<label class="path-quiz-option ${selected === option.id ? "selected" : ""} ${pathQuizSession.checked && question.answer.includes(option.id) ? "correct" : ""} ${pathQuizSession.checked && selected === option.id && !isCorrect ? "wrong" : ""}"><input type="radio" name="pathQuizAnswer" value="${option.id}" ${selected === option.id ? "checked" : ""} ${pathQuizSession.checked ? "disabled" : ""}><span>${lang === "ar" ? option.ar : option.en}</span></label>`).join("")}</div>${pathQuizSession.checked ? `<div class="path-quiz-feedback ${isCorrect ? "correct" : "wrong"}"><strong>${isCorrect ? t("correct") : t("incorrect")}</strong><br>${lang === "ar" ? question.explanation_ar : question.explanation_en}</div>` : ""}<div class="path-quiz-actions">${pathQuizSession.checked ? `<button class="btn btn-primary" id="pathQuizNext">${pathQuizSession.index === pathQuizSession.pool.length - 1 ? t("finishQuiz") : t("pathQuizNext")}</button>` : `<button class="btn btn-primary" id="pathQuizCheck">${t("checkAnswer")}</button>`}</div></div>`;
  if (!pathQuizSession.checked){
    content.querySelectorAll('input[name="pathQuizAnswer"]').forEach(input => input.addEventListener("change", () => { pathQuizSession.answers[question.id] = input.value; renderPathQuiz(); }));
    document.getElementById("pathQuizCheck").addEventListener("click", () => { if (!pathQuizSession.answers[question.id]) { const n = document.createElement("div"); n.className = "path-quiz-feedback wrong"; n.textContent = t("chooseAnswer"); content.appendChild(n); return; } pathQuizSession.checked = true; if (question.answer.includes(pathQuizSession.answers[question.id])) pathQuizSession.correct += 1; renderPathQuiz(); });
  } else document.getElementById("pathQuizNext").addEventListener("click", () => { pathQuizSession.index += 1; pathQuizSession.checked = false; renderPathQuiz(); });
}
function openPathQuiz(){ const modal = document.getElementById("pathQuizModal"); if (!modal) return; pathQuizSession = null; modal.hidden = false; renderPathQuiz(); }

function openNode(id){
  current = findNode(id);
  if (!current) return;
  const st = progress[id] || "pending";
  document.getElementById("dTag").textContent = t(current.type);
  document.getElementById("dTitle").textContent = lang === "ar" ? current.ar : current.en;
  document.getElementById("dAlt").textContent = lang === "ar" ? current.en : current.ar;
  document.getElementById("dMark").textContent = t("markAs");
  document.getElementById("dResTitle").textContent = t("resources");
  document.getElementById("dStates").innerHTML =
    ["done","learning","skip","pending"].map(s =>
      `<button class="btn ${st === s ? "sel" : ""}" data-s="${s}">${t(s)}</button>`).join("");
  document.getElementById("dStates").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => {
      const s = b.dataset.s;
      if (s === "pending") delete progress[current.id]; else progress[current.id] = s;
      save(); render(); openNode(current.id);
    }));
  const note = lang === "ar" ? current.note_ar : current.note_en;
  document.getElementById("dNote").textContent = note || "";
  const res = current.resources || [];
  document.getElementById("dRes").innerHTML = res.length
    ? res.map(r => `<a href="${r.url}" target="_blank" rel="noopener">🔗 ${r.title}</a>`).join("")
    : `<p style="color:var(--muted);font-size:14px">${t("nores")}</p>`;
  renderQuiz(current);
  document.getElementById("scrim").classList.add("on");
  document.getElementById("drawer").classList.add("on");
}
function closeDrawer(){
  document.getElementById("scrim").classList.remove("on");
  document.getElementById("drawer").classList.remove("on");
}

document.getElementById("scrim").addEventListener("click", closeDrawer);
document.getElementById("pathQuizStart").addEventListener("click", openPathQuiz);
document.getElementById("pathQuizClose").addEventListener("click", closePathQuiz);
document.getElementById("pathQuizModal").addEventListener("click", e => { if (e.target.id === "pathQuizModal") closePathQuiz(); });
document.getElementById("dClose").addEventListener("click", closeDrawer);
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closePathQuiz(); } });
document.getElementById("langBtn").addEventListener("click", () => {
  lang = lang === "ar" ? "en" : "ar"; localStorage.setItem("rm_lang", lang); window.dispatchEvent(new CustomEvent("rm:language-changed", { detail: { lang } })); render(); if (!document.getElementById("pathQuizModal").hidden) renderPathQuiz(); closeDrawer();
});
document.getElementById("themeBtn").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark"; localStorage.setItem("rm_theme", theme); applyShell();
});
document.getElementById("resetBtn").addEventListener("click", () => {
  progress = {}; localStorage.removeItem(KEY); window.dispatchEvent(new CustomEvent("rm:progress-reset", { detail: { slug } })); render();
});

Promise.all([
  fetch(`./data/${slug}.json`).then(r => r.ok ? r.json() : Promise.reject()),
  fetch(`./data/quizzes/${slug}.json`).then(r => r.ok ? r.json() : { topics: {} }).catch(() => ({ topics: {} }))
])
  .then(([roadmap, quizzes]) => {
    data = roadmap;
    quizData = quizzes.topics || {};
    render();
  })
  .catch(() => { document.getElementById("map").innerHTML = "<p>Roadmap not found.</p>"; });
