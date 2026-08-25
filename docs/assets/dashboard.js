(function(){
  const T={
    ar:{backHome:"الخرائط",nav:"لوحة الإنجاز",kicker:"منصة تعلّم ماجد السكني",title:"لوحة إنجازك التعليمية",lead:"رؤية واحدة تجمع تقدّمك، اختباراتك، وخطوتك التالية.",done:"الموضوعات المنجزة",doneMeta:"من أصل",learning:"قيد التعلم",learningMeta:"خطوات نشطة",quiz:"متوسط الاختبارات",quizEmpty:"لا توجد محاولات بعد",quizAttempts:"محاولة",paths:"المسارات النشطة",pathsMeta:"اختر مسارًا وابدأ",mapKicker:"خريطة التقدم",myPaths:"مساراتي التعليمية",browse:"استكشف المسارات",nextKicker:"الخطوة التالية",nextEmptyTitle:"ابدأ باختيار مسار",nextEmptyText:"سنقترح لك أول موضوع غير منجز في المسار الأكثر نشاطًا.",nextOpen:"افتح الموضوع التالي",activityKicker:"ذاكرة التعلم",activityTitle:"آخر النشاطات",activityEmpty:"لا توجد نشاطات بعد. ابدأ اختبارًا أو أنجز موضوعًا.",guest:"ضيف",local:"تقدمك محفوظ محليًا",cloud:"تقدمك متزامن مع الحساب",topics:"موضوع",doneWord:"أنجزته",learningWord:"أتعلّمه",continue:"تابع المسار",recentQuiz:"اختبار قصير",passed:"اجتاز",pending:"متبقي",syncing:"جارٍ التحقق من المزامنة…"},
    en:{backHome:"Roadmaps",nav:"Progress dashboard",kicker:"Majid Al-Sakani Learning Platform",title:"Your learning progress",lead:"One clear view of your paths, quizzes, and next best step.",done:"Completed topics",doneMeta:"of",learning:"In progress",learningMeta:"active steps",quiz:"Quiz average",quizEmpty:"No attempts yet",quizAttempts:"attempts",paths:"Active roadmaps",pathsMeta:"Choose a path and start",mapKicker:"Progress map",myPaths:"My learning paths",browse:"Explore roadmaps",nextKicker:"Next best step",nextEmptyTitle:"Choose a roadmap to begin",nextEmptyText:"We will suggest the first incomplete topic in your most active path.",nextOpen:"Open next topic",activityKicker:"Learning memory",activityTitle:"Recent activity",activityEmpty:"No activity yet. Start a quiz or complete a topic.",guest:"Guest",local:"Progress saved locally",cloud:"Progress synced to your account",topics:"topics",doneWord:"done",learningWord:"learning",continue:"Continue path",recentQuiz:"Quick quiz",passed:"Passed",pending:"remaining",syncing:"Checking sync…"}
  };
  let lang=localStorage.getItem("rm_lang")||"ar", theme=localStorage.getItem("rm_theme")||"dark", catalog=[], details=[], snapshot=null;
  const t=()=>T[lang];
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const color=v=>/^#[0-9a-f]{6}$/i.test(String(v||""))?v:"#2d8cff";
  function applyShell(){
    document.documentElement.lang=lang; document.documentElement.dir=lang==="ar"?"rtl":"ltr"; document.documentElement.dataset.theme=theme;
    document.getElementById("langBtn").textContent=lang==="ar"?"English":"العربية";
    document.getElementById("themeBtn").textContent=theme==="dark"?"☀️":"🌙";
    const labels={backHome:"backHome",dashboardNav:"nav",kicker:"kicker",title:"title",lead:"lead",statDoneLabel:"done",statLearningLabel:"learning",statQuizLabel:"quiz",statPathsLabel:"paths",pathsKicker:"mapKicker",pathsTitle:"myPaths",browseBtn:"browse",nextKicker:"nextKicker",activityKicker:"activityKicker",activityTitle:"activityTitle"};
    Object.entries(labels).forEach(([id,key])=>{const e=document.getElementById(id);if(e)e.textContent=t()[key]||e.textContent});
    document.getElementById("statDoneMeta").dataset.prefix=t().doneMeta;
    document.getElementById("statLearningMeta").textContent=t().learningMeta; document.getElementById("identityName").textContent=snapshot?.user?(snapshot.user.email||t().cloud):t().guest; document.getElementById("identityState").textContent=snapshot?.user?t().cloud:t().local; document.getElementById("avatar").textContent=snapshot?.user?(snapshot.user.email||"م").slice(0,1).toUpperCase():lang==="ar"?"م":"G";
  }
  function localState(slug){return snapshot?.local?.progress?.[slug]||JSON.parse(localStorage.getItem("rm_progress_"+slug)||"{}");}
  function localQuiz(slug){return snapshot?.local?.quizzes?.[slug]||JSON.parse(localStorage.getItem("rm_quiz_"+slug)||"{}");}
  function stats(item){
    const state=localState(item.slug), all=details.find(x=>x.slug===item.slug), nodes=all?.nodes||[];
    const total=item.topic_count||nodes.length, done=Object.values(state).filter(x=>x==="done").length, learning=Object.values(state).filter(x=>x==="learning").length;
    const quizzes=Object.values(localQuiz(item.slug)), attempted=quizzes.filter(x=>(x.attempts||0)>0), avg=attempted.length?Math.round(attempted.reduce((s,x)=>s+Number(x.bestScore||0),0)/attempted.length):null;
    const next=nodes.find(x=>state[x.id]!=="done"&&state[x.id]!=="skip");
    return {total,done,learning,avg,attempted,attemptCount:attempted.reduce((sum,x)=>sum+Number(x.attempts||0),0),next,pct:total?Math.round(done/total*100):0};
  }
  function renderStats(){
    const rows=catalog.map(stats), done=rows.reduce((s,x)=>s+x.done,0), learning=rows.reduce((s,x)=>s+x.learning,0), quizRows=rows.filter(x=>x.avg!==null), avg=quizRows.length?Math.round(quizRows.reduce((s,x)=>s+x.avg,0)/quizRows.length):null, active=rows.filter(x=>x.done||x.learning).length, total=rows.reduce((s,x)=>s+x.total,0);
    document.getElementById("statDone").textContent=done; document.getElementById("statDoneMeta").textContent=`${t().doneMeta} ${total}`; document.getElementById("statLearning").textContent=learning; document.getElementById("statQuiz").textContent=avg===null?"—":`${avg}%`; document.getElementById("statQuizMeta").textContent=avg===null?t().quizEmpty:`${quizRows.reduce((s,x)=>s+x.attemptCount,0)} ${t().quizAttempts}`; document.getElementById("statPaths").textContent=active; document.getElementById("statPathsMeta").textContent=active?`${active} / ${catalog.length}`:t().pathsMeta;
  }
  function renderPaths(){
    const list=document.getElementById("pathsList");
    list.innerHTML=catalog.map(item=>{const s=stats(item);return `<article class="path-progress-card" style="--path-accent:${color(item.color)}"><div class="path-name"><strong>${esc(lang==="ar"?item.ar:item.en)}</strong><span>${s.done} ${t().doneWord} · ${s.learning} ${t().learningWord}</span></div><div><div class="path-bar"><i style="width:${s.pct}%"></i></div><div class="path-meta"><span>${s.done} ${t().doneWord} ${t().topics}</span><span>${s.total} ${t().topics}</span></div></div><div><div class="path-percent">${s.pct}%</div><a class="path-link" href="./roadmap.html?r=${encodeURIComponent(item.slug)}">${t().continue} →</a></div></article>`}).join("")||`<div class="empty-dashboard">${t().pathsMeta}</div>`;
  }
  function renderNext(){
    const ranked=catalog.map(item=>({item,s:stats(item)})).filter(x=>x.s.next).sort((a,b)=>(b.s.done+b.s.learning)-(a.s.done+a.s.learning));
    const target=ranked[0], title=document.getElementById("nextTitle"), text=document.getElementById("nextText"), button=document.getElementById("nextButton");
    if(!target){title.textContent=t().nextEmptyTitle;text.textContent=t().nextEmptyText;button.textContent=t().browse;button.href="./index.html";return;}
    const name=lang==="ar"?target.item.ar:target.item.en, topic=lang==="ar"?target.s.next.ar:target.s.next.en; title.textContent=topic; text.textContent=`${name} · ${target.s.pct}%`; button.textContent=t().nextOpen; button.href=`./roadmap.html?r=${encodeURIComponent(target.item.slug)}#${encodeURIComponent(target.s.next.id)}`;
  }
  function renderActivity(){
    const events=[]; catalog.forEach(item=>{const q=localQuiz(item.slug);Object.entries(q).forEach(([nodeId,result])=>{if(result.updatedAt)events.push({item,nodeId,result})})}); events.sort((a,b)=>new Date(b.result.updatedAt)-new Date(a.result.updatedAt)); const el=document.getElementById("activityList");
    el.innerHTML=events.slice(0,6).map(e=>{const all=details.find(x=>x.slug===e.item.slug),node=all?.nodes.find(x=>x.id===e.nodeId),label=node?(lang==="ar"?node.ar:node.en):e.nodeId;return `<div class="activity-item"><div><strong>${esc(label)}</strong><span>${esc(lang==="ar"?e.item.ar:e.item.en)} · ${t().recentQuiz}</span></div><span class="activity-score">${e.result.bestScore||0}%</span></div>`}).join("")||`<div class="empty-dashboard">${t().activityEmpty}</div>`;
  }
  async function load(){
    document.getElementById("pathsList").innerHTML=`<div class="dashboard-loading">${t().syncing}</div>`;
    try{snapshot=window.RoadmapSync?.getSnapshot?await window.RoadmapSync.getSnapshot():{user:null,local:{progress:{},quizzes:{}}}}catch(_){snapshot={user:null,local:{progress:{},quizzes:{}}};}
    catalog=await fetch("./data/roadmaps.json").then(r=>r.json()).then(x=>x.roadmaps); details=await Promise.all(catalog.map(i=>fetch(`./data/${i.slug}.json`).then(r=>r.json()).then(d=>({slug:i.slug,nodes:d.groups.flatMap(g=>g.nodes||[])})))); applyShell(); renderStats();renderPaths();renderNext();renderActivity();
  }
  document.getElementById("langBtn").addEventListener("click",()=>{lang=lang==="ar"?"en":"ar";localStorage.setItem("rm_lang",lang);applyShell();renderStats();renderPaths();renderNext();renderActivity();});
  document.getElementById("themeBtn").addEventListener("click",()=>{theme=theme==="dark"?"light":"dark";localStorage.setItem("rm_theme",theme);applyShell();});
  window.addEventListener("rm:sync-applied",load);window.addEventListener("rm:user-changed",load);window.addEventListener("rm:progress-changed",load);window.addEventListener("rm:quiz-changed",load);load();
})();
