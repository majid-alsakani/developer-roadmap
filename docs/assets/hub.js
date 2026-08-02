/* Roadmap hub — searchable bilingual catalog. */
let lang = localStorage.getItem("rm_lang") || "ar";
let theme = localStorage.getItem("rm_theme") || "light";
let items = [];
const L = {
  ar:{title:"خرائط تعلّم البرمجة",lead:"خرائط تفاعلية شاملة بالعربية والإنجليزية — تتبّع تقدّمك خطوة بخطوة في كل مسار.",search:"ابحث عن مسار… (Frontend، بايثون، الذكاء الاصطناعي)",nodes:"موضوع",groups:"مرحلة",start:"ابدأ المسار"},
  en:{title:"Developer Roadmaps",lead:"Comprehensive interactive roadmaps in Arabic & English — track your progress step by step.",search:"Search a path… (Frontend, Python, AI)",nodes:"topics",groups:"stages",start:"Start path"}
};
function shell(){
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.theme = theme;
  document.getElementById("langBtn").textContent = lang === "ar" ? "English" : "العربية";
  document.getElementById("themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
  document.getElementById("h1").textContent = L[lang].title;
  document.getElementById("lead").textContent = L[lang].lead;
  document.getElementById("search").placeholder = L[lang].search;
}
function draw(filter = ""){
  const f = filter.trim().toLowerCase();
  document.getElementById("grid").innerHTML = items
    .filter(i => !f || (i.en + i.ar + i.desc_en + i.desc_ar + i.slug).toLowerCase().includes(f))
    .map(i => `<a class="card" href="./roadmap.html?r=${i.slug}">
      <div class="icon" style="background:${i.color}22;color:${i.color}">${i.icon}</div>
      <h3>${lang === "ar" ? i.ar : i.en}</h3>
      <p>${lang === "ar" ? i.desc_ar : i.desc_en}</p>
      <div class="meta"><span>${i.nodes} ${L[lang].nodes}</span><span>${i.groups} ${L[lang].groups}</span>
      <span style="color:${i.color};font-weight:700">${L[lang].start} →</span></div></a>`).join("");
}
document.getElementById("langBtn").addEventListener("click", () => {
  lang = lang === "ar" ? "en" : "ar"; localStorage.setItem("rm_lang", lang); shell(); draw(document.getElementById("search").value);
});
document.getElementById("themeBtn").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark"; localStorage.setItem("rm_theme", theme); shell();
});
document.getElementById("search").addEventListener("input", e => draw(e.target.value));
fetch("./data/index.json").then(r => r.json()).then(d => { items = d.roadmaps; shell(); draw(); });
