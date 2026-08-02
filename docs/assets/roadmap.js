/* Interactive roadmap renderer — bilingual, progress-tracking, zero dependencies. */
const T = {
  en: { back:"All roadmaps", progress:"Your progress", done:"Done", learning:"Learning", skip:"Skip", pending:"Pending",
        reset:"Reset", primary:"Core", secondary:"Recommended", optional:"Optional",
        resources:"Free resources", nores:"No links yet — contributions welcome.", close:"Close",
        of:"of", topics:"topics", markAs:"Mark this topic", share:"Copy link" },
  ar: { back:"كل الخرائط", progress:"تقدّمك", done:"أنجزته", learning:"أتعلّمه", skip:"تخطّيته", pending:"لم يبدأ",
        reset:"إعادة تعيين", primary:"أساسي", secondary:"موصى به", optional:"اختياري",
        resources:"مصادر مجانية", nores:"لا توجد روابط بعد — مساهماتك مرحّب بها.", close:"إغلاق",
        of:"من", topics:"موضوعًا", markAs:"حدّد حالة الموضوع", share:"نسخ الرابط" }
};
const q = new URLSearchParams(location.search);
const slug = q.get("r") || "frontend";
let lang = localStorage.getItem("rm_lang") || "ar";
let theme = localStorage.getItem("rm_theme") || "light";
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

function setMeta(sel, attr, key, content){
  let el = document.head.querySelector(`${sel}[${attr}="${key}"]`);
  if (!el){ el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

/* Per-roadmap SEO: unique title, description, canonical, OG tags and JSON-LD. */
function renderSeo(){
  const name = lang === "ar" ? data.ar : data.en;
  const alt  = lang === "ar" ? data.en : data.ar;
  const desc = (lang === "ar" ? data.desc_ar : data.desc_en) +
    (lang === "ar" ? ` — ${data.total} موضوعًا بإعداد ${AUTHOR.nameAr} (${AUTHOR.name}).`
                   : ` — ${data.total} topics curated by ${AUTHOR.name} (${AUTHOR.nameAr}).`);
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
        isAccessibleForFree: true, numberOfCredits: data.total,
        provider: { "@type": "Person", name: AUTHOR.name, alternateName: AUTHOR.nameAr, url: AUTHOR.url },
        author:   { "@type": "Person", name: AUTHOR.name, alternateName: AUTHOR.nameAr, url: AUTHOR.url },
        hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: `PT${data.total * 3}H` } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "ar" ? "كل الخرائط" : "All roadmaps", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name, item: url } ] }
    ]
  };
  let s = document.getElementById("ldjson");
  if (!s){ s = document.createElement("script"); s.type = "application/ld+json"; s.id = "ldjson"; document.head.appendChild(s); }
  s.textContent = JSON.stringify(ld);
}

function save(){ localStorage.setItem(KEY, JSON.stringify(progress)); }

function stats(){
  const total = data.total;
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
  document.getElementById("backBtn").textContent = "← " + t("back");
  document.getElementById("h1").textContent = data.icon + " " + (lang === "ar" ? data.ar : data.en);
  document.getElementById("lead").textContent = lang === "ar" ? data.desc_ar : data.desc_en;
  document.getElementById("progLabel").textContent = t("progress");
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
