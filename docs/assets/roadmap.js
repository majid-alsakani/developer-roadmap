/* Interactive roadmap renderer — bilingual, progress-tracking, zero dependencies. */
const T = {
  en: { back:"All roadmaps", progress:"Your progress", done:"Done", learning:"Learning", skip:"Skip", pending:"Pending",
        reset:"Reset", primary:"Core", secondary:"Recommended", optional:"Optional",
        resources:"Free resources", nores:"No links yet — contributions welcome.", close:"Close", saved:"Your progress is saved on this device.",
        of:"of", topics:"topics", markAs:"Mark this topic", share:"Copy link" },
  ar: { back:"كل الخرائط", progress:"تقدّمك", done:"أنجزته", learning:"أتعلّمه", skip:"تخطّيته", pending:"لم يبدأ",
        reset:"إعادة تعيين", primary:"أساسي", secondary:"موصى به", optional:"اختياري",
        resources:"مصادر مجانية", nores:"لا توجد روابط بعد — مساهماتك مرحّب بها.", close:"إغلاق", saved:"يُحفظ تقدمك على هذا الجهاز.",
        of:"من", topics:"موضوعًا", markAs:"حدّد حالة الموضوع", share:"نسخ الرابط" }
};
const q = new URLSearchParams(location.search);
const slug = q.get("r") || "frontend";
let lang = localStorage.getItem("rm_lang") || "ar";
let theme = localStorage.getItem("rm_theme") || "dark";
const KEY = "rm_progress_" + slug;
let progress = JSON.parse(localStorage.getItem(KEY) || "{}");
let data = null, current = null;

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
function save(){ localStorage.setItem(KEY, JSON.stringify(progress)); }

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
          return `<button class="node ${nd.type}" data-id="${nd.id}" ${st ? `data-state="${st}"` : ""}>
            <span>${lang === "ar" ? nd.ar : nd.en}<span class="sub">${lang === "ar" ? nd.en : nd.ar}</span></span>
            <span class="tick">${mark}</span></button>`;
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
  document.getElementById("scrim").classList.add("on");
  document.getElementById("drawer").classList.add("on");
}
function closeDrawer(){
  document.getElementById("scrim").classList.remove("on");
  document.getElementById("drawer").classList.remove("on");
}

document.getElementById("scrim").addEventListener("click", closeDrawer);
document.getElementById("dClose").addEventListener("click", closeDrawer);
document.addEventListener("keydown", e => e.key === "Escape" && closeDrawer());
document.getElementById("langBtn").addEventListener("click", () => {
  lang = lang === "ar" ? "en" : "ar"; localStorage.setItem("rm_lang", lang); render(); closeDrawer();
});
document.getElementById("themeBtn").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark"; localStorage.setItem("rm_theme", theme); applyShell();
});
document.getElementById("resetBtn").addEventListener("click", () => {
  progress = {}; save(); render();
});

fetch(`./data/${slug}.json`)
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(d => { data = d; render(); })
  .catch(() => { document.getElementById("map").innerHTML = "<p>Roadmap not found.</p>"; });
