/* Account and offline-first synchronization layer for GitHub Pages. */
(function () {
  const CONFIG = window.ROADMAP_SUPABASE || { enabled: false, url: "", publishableKey: "" };
  const QUEUE_KEY = "rm_sync_queue_v1";
  const META_PREFIX = "rm_progress_meta_";
  const STATUS_RANK = { "": 0, skip: 1, learning: 2, done: 3 };
  let client = null;
  let user = null;
  let initialized = false;
  let status = "local";

  const copy = {
    ar: {
      account: "الحساب", dashboard: "لوحة الإنجاز", signedIn: "الحساب متصل", signedOut: "ضيف — تقدمك محلي", syncing: "جارٍ مزامنة تقدمك…", synced: "تمت المزامنة مع الحساب", offline: "وضع عدم الاتصال — سيعاد المحاولة", setup: "الحسابات جاهزة، لكن لم تتم تهيئة Supabase بعد.", setupHint: "أضف رابط المشروع وpublishable key في supabase-config.js ثم طبّق migration قاعدة البيانات.", signIn: "تسجيل الدخول", signOut: "تسجيل الخروج", github: "المتابعة مع GitHub", magic: "إرسال رابط دخول بالبريد", email: "البريد الإلكتروني", close: "إغلاق", sent: "تم إرسال رابط الدخول. افحص بريدك.", invalid: "أدخل بريدًا إلكترونيًا صحيحًا.", error: "تعذر تنفيذ العملية. تحقق من إعدادات Supabase أو اتصال الشبكة.", local: "التقدم محفوظ محليًا على هذا الجهاز." },
    en: {
      account: "Account", dashboard: "Progress dashboard", signedIn: "Account connected", signedOut: "Guest — progress is local", syncing: "Syncing your progress…", synced: "Synced with your account", offline: "Offline — will retry automatically", setup: "Accounts are ready, but Supabase is not configured yet.", setupHint: "Add the project URL and publishable key to supabase-config.js, then apply the database migration.", signIn: "Sign in", signOut: "Sign out", github: "Continue with GitHub", magic: "Send magic link", email: "Email address", close: "Close", sent: "Sign-in link sent. Check your email.", invalid: "Enter a valid email address.", error: "The operation failed. Check Supabase settings or your connection.", local: "Progress is saved locally on this device." }
  };

  function lang() { return localStorage.getItem("rm_lang") || "ar"; }
  function text(key) { return (copy[lang()] || copy.ar)[key]; }
  function emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); }
  function parse(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function validConfig() { return Boolean(CONFIG.enabled && /^https:\/\//.test(CONFIG.url) && CONFIG.publishableKey && !/secret|service_role/i.test(CONFIG.publishableKey)); }

  function queueRows(rows) {
    if (!rows.length) return;
    const old = parse(QUEUE_KEY, []);
    const map = new Map(old.map(row => [row.key, row]));
    rows.forEach(row => map.set(row.key, row));
    write(QUEUE_KEY, Array.from(map.values()).slice(-2000));
  }

  function progressRows(slug, progress) {
    const metaKey = META_PREFIX + slug;
    const meta = parse(metaKey, {});
    const now = new Date().toISOString();
    return Object.entries(progress || {}).map(([nodeId, state]) => ({
      key: `progress:${slug}:${nodeId}`,
      kind: "progress",
      roadmap_slug: slug,
      node_id: nodeId,
      status: state,
      updated_at: meta[nodeId]?.updatedAt || now
    }));
  }

  function quizRows(slug, results) {
    return Object.entries(results || {}).map(([nodeId, result]) => ({
      key: `quiz:${slug}:${nodeId}`,
      kind: "quiz_results",
      roadmap_slug: slug,
      node_id: nodeId,
      best_score: Number(result.bestScore || 0),
      attempts: Number(result.attempts || 0),
      passed: Boolean(result.passed),
      updated_at: result.updatedAt || new Date().toISOString()
    }));
  }

  function updateMeta(slug, progress) {
    const meta = parse(META_PREFIX + slug, {});
    const now = new Date().toISOString();
    Object.keys(progress || {}).forEach(nodeId => {
      meta[nodeId] = { updatedAt: now };
    });
    write(META_PREFIX + slug, meta);
  }

  function ensureUi() {
    if (document.getElementById("accountRoot")) return;
    const actionHost = document.querySelector(".roadmap-actions");
    const topbar = document.querySelector(".topbar");
    const anchor = document.getElementById("langBtn");
    const host = actionHost || topbar;
    if (!host) return;
    const root = document.createElement("div");
    root.id = "accountRoot";
    root.className = "account-root";
    root.innerHTML = `<button class="btn account-button" id="accountButton" type="button"></button><span class="sync-status" id="syncStatus" aria-live="polite"></span><div class="account-popover" id="accountPopover" hidden><strong id="accountTitle"></strong><p id="accountMessage"></p><div class="account-actions" id="accountActions"></div><button class="btn account-close" id="accountClose" type="button"></button></div>`;
    if (actionHost) actionHost.prepend(root); else if (anchor) anchor.parentElement.insertBefore(root, anchor); else host.appendChild(root);
    document.getElementById("accountButton").addEventListener("click", () => { const pop = document.getElementById("accountPopover"); pop.hidden = !pop.hidden; renderUi(); });
    document.getElementById("accountClose").addEventListener("click", () => { document.getElementById("accountPopover").hidden = true; });
  }

  function setStatus(next) { status = next; renderUi(); }
  function renderUi() {
    ensureUi();
    const button = document.getElementById("accountButton");
    const title = document.getElementById("accountTitle");
    const message = document.getElementById("accountMessage");
    const actions = document.getElementById("accountActions");
    const close = document.getElementById("accountClose");
    const statusEl = document.getElementById("syncStatus");
    if (!button || !title || !message || !actions || !close) return;
    button.textContent = user ? text("signedIn") : text("account");
    title.textContent = user ? (user.email || text("signedIn")) : text("account");
    close.textContent = text("close");
    statusEl.textContent = user ? (status === "syncing" ? text("syncing") : status === "synced" ? text("synced") : status === "offline" ? text("offline") : text("signedIn")) : text("signedOut");
    if (!validConfig()) {
      message.textContent = text("setup");
      actions.innerHTML = `<p class="account-hint">${text("setupHint")}</p><a class="btn account-dashboard" href="./dashboard.html">${text("dashboard")}</a>`;
      return;
    }
    if (user) {
      message.textContent = status === "synced" ? text("synced") : text("syncing");
      actions.innerHTML = `<a class="btn account-dashboard" href="./dashboard.html">${text("dashboard")}</a><button class="btn" id="signOutButton" type="button">${text("signOut")}</button>`;
      document.getElementById("signOutButton").addEventListener("click", signOut);
      return;
    }
    message.textContent = text("local");
    actions.innerHTML = `<a class="btn account-dashboard" href="./dashboard.html">${text("dashboard")}</a><button class="btn btn-primary" id="githubButton" type="button">${text("github")}</button><div class="account-divider">${lang() === "ar" ? "أو" : "or"}</div><label class="account-label" for="magicEmail">${text("email")}</label><input class="account-input" id="magicEmail" type="email" autocomplete="email" placeholder="name@example.com"><button class="btn" id="magicButton" type="button">${text("magic")}</button>`;
    document.getElementById("githubButton").addEventListener("click", signInGithub);
    document.getElementById("magicButton").addEventListener("click", signInMagic);
  }

  async function loadClient() {
    if (!validConfig() || client) return client;
    const mod = await import("https://esm.sh/@supabase/supabase-js@2");
    client = mod.createClient(CONFIG.url, CONFIG.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    client.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      if (user) mergeAccount(); else setStatus("local");
      emit("rm:user-changed", { user });
    });
    const session = await client.auth.getSession();
    user = session.data.session?.user || null;
    return client;
  }

  async function signInGithub() {
    try { await loadClient(); await client.auth.signInWithOAuth({ provider: "github", options: { redirectTo: location.href } }); }
    catch (_) { showError(); }
  }

  async function signInMagic() {
    const input = document.getElementById("magicEmail");
    if (!input || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) { showMessage(text("invalid")); return; }
    try { await loadClient(); const result = await client.auth.signInWithOtp({ email: input.value.trim(), options: { emailRedirectTo: location.href } }); if (result.error) throw result.error; showMessage(text("sent")); }
    catch (_) { showError(); }
  }

  async function signOut() { try { await client.auth.signOut(); user = null; setStatus("local"); } catch (_) { showError(); } }
  function showMessage(value) { const el = document.getElementById("accountMessage"); if (el) el.textContent = value; }
  function showError() { showMessage(text("error")); }

  async function fetchCloud() {
    const [progressResult, quizResult] = await Promise.all([
      client.from("progress").select("roadmap_slug,node_id,status,updated_at"),
      client.from("quiz_results").select("roadmap_slug,node_id,best_score,attempts,passed,updated_at")
    ]);
    if (progressResult.error) throw progressResult.error;
    if (quizResult.error) throw quizResult.error;
    return { progress: progressResult.data || [], quizzes: quizResult.data || [] };
  }

  function mergeProgress(cloudRows) {
    const bySlug = {};
    cloudRows.forEach(row => { (bySlug[row.roadmap_slug] ||= {})[row.node_id] = row; });
    const merged = [];
    Object.entries(bySlug).forEach(([slug, cloud]) => {
      const local = parse("rm_progress_" + slug, {});
      const allIds = new Set([...Object.keys(local), ...Object.keys(cloud)]);
      const meta = parse(META_PREFIX + slug, {});
      const result = {};
      allIds.forEach(nodeId => {
        const localState = local[nodeId] || "";
        const cloudState = cloud[nodeId]?.status || "";
        const localTime = meta[nodeId]?.updatedAt || "1970-01-01T00:00:00.000Z";
        const cloudTime = cloud[nodeId]?.updated_at || "1970-01-01T00:00:00.000Z";
        const keepDone = localState === "done" || cloudState === "done";
        const chosen = keepDone ? "done" : (new Date(localTime) >= new Date(cloudTime) ? localState : cloudState);
        if (chosen) result[nodeId] = chosen;
        meta[nodeId] = { updatedAt: new Date(Math.max(new Date(localTime).getTime(), new Date(cloudTime).getTime(), Date.now())).toISOString() };
        if (chosen) merged.push({ user_id: user.id, roadmap_slug: slug, node_id: nodeId, status: chosen, updated_at: meta[nodeId].updatedAt });
      });
      write("rm_progress_" + slug, result); write(META_PREFIX + slug, meta); emit("rm:sync-applied", { slug });
    });
    return merged;
  }

  function mergeQuizzes(cloudRows) {
    const merged = [];
    const bySlug = {};
    cloudRows.forEach(row => { (bySlug[row.roadmap_slug] ||= {})[row.node_id] = row; });
    Object.entries(bySlug).forEach(([slug, cloud]) => {
      const local = parse("rm_quiz_" + slug, {});
      const result = { ...local };
      Object.entries(cloud).forEach(([nodeId, row]) => {
        const old = result[nodeId] || {};
        const mergedRow = { bestScore: Math.max(Number(old.bestScore || 0), Number(row.best_score || 0)), attempts: Math.max(Number(old.attempts || 0), Number(row.attempts || 0)), passed: Boolean(old.passed || row.passed), updatedAt: new Date(Math.max(new Date(old.updatedAt || 0).getTime(), new Date(row.updated_at || 0).getTime(), Date.now())).toISOString() };
        result[nodeId] = mergedRow;
        merged.push({ user_id: user.id, roadmap_slug: slug, node_id: nodeId, best_score: mergedRow.bestScore, attempts: mergedRow.attempts, passed: mergedRow.passed, updated_at: mergedRow.updatedAt });
      });
      write("rm_quiz_" + slug, result); emit("rm:sync-applied", { slug });
    });
    return merged;
  }

  async function mergeAccount() {
    if (!client || !user) return;
    setStatus("syncing");
    try {
      const cloud = await fetchCloud();
      const progress = mergeProgress(cloud.progress);
      const quizzes = mergeQuizzes(cloud.quizzes);
      const localProgress = Object.keys(localStorage).filter(k => k.startsWith("rm_progress_") && !k.startsWith("rm_progress_meta_")).flatMap(k => progressRows(k.replace("rm_progress_", ""), parse(k, {})));
      const localQuizzes = Object.keys(localStorage).filter(k => k.startsWith("rm_quiz_")).flatMap(k => quizRows(k.replace("rm_quiz_", ""), parse(k, {})));
      const progressRowsToUpsert = [...localProgress.map(row => ({ user_id: user.id, roadmap_slug: row.roadmap_slug, node_id: row.node_id, status: row.status, updated_at: row.updated_at })), ...progress];
      const quizRowsToUpsert = [...localQuizzes.map(row => ({ user_id: user.id, roadmap_slug: row.roadmap_slug, node_id: row.node_id, best_score: row.best_score, attempts: row.attempts, passed: row.passed, updated_at: row.updated_at })), ...quizzes];
      if (progressRowsToUpsert.length) { const result = await client.from("progress").upsert(progressRowsToUpsert, { onConflict: "user_id,roadmap_slug,node_id" }); if (result.error) throw result.error; }
      if (quizRowsToUpsert.length) { const result = await client.from("quiz_results").upsert(quizRowsToUpsert, { onConflict: "user_id,roadmap_slug,node_id" }); if (result.error) throw result.error; }
      setStatus("synced"); await flushQueue();
    } catch (_) { setStatus(navigator.onLine ? "local" : "offline"); }
  }

  function eventRow(slug, eventType, nodeId, metadata) {
    return { key: `event:${slug}:${eventType}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, kind: "learning_event", roadmap_slug: slug, node_id: nodeId || null, event_type: eventType, metadata: metadata || {}, created_at: new Date().toISOString() };
  }

  async function pushEvent(slug, eventType, nodeId, metadata) {
    const row = eventRow(slug, eventType, nodeId, metadata);
    if (!user || !client || !navigator.onLine) { queueRows([row]); return; }
    try {
      const result = await client.from("learning_events").insert({ user_id: user.id, roadmap_slug: row.roadmap_slug, node_id: row.node_id, event_type: row.event_type, metadata: row.metadata, created_at: row.created_at });
      if (result.error) throw result.error;
    } catch (_) { queueRows([row]); }
  }

  async function pushProgress(slug, progress) {
    updateMeta(slug, progress);
    const rows = progressRows(slug, progress);
    if (!user || !client || !rows.length) { queueRows(rows); return; }
    const payload = rows.map(row => ({ user_id: user.id, roadmap_slug: row.roadmap_slug, node_id: row.node_id, status: row.status, updated_at: row.updated_at }));
    try { const result = await client.from("progress").upsert(payload, { onConflict: "user_id,roadmap_slug,node_id" }); if (result.error) throw result.error; setStatus("synced"); }
    catch (_) { queueRows(rows); setStatus(navigator.onLine ? "local" : "offline"); }
    pushEvent(slug, "progress_saved", null, { completed: Object.values(progress || {}).filter(v => v === "done").length, learning: Object.values(progress || {}).filter(v => v === "learning").length });
  }

  async function pushQuiz(slug, results) {
    const rows = quizRows(slug, results);
    if (!user || !client || !rows.length) { queueRows(rows); return; }
    const payload = rows.map(row => ({ user_id: user.id, roadmap_slug: row.roadmap_slug, node_id: row.node_id, best_score: row.best_score, attempts: row.attempts, passed: row.passed, updated_at: row.updated_at }));
    try { const result = await client.from("quiz_results").upsert(payload, { onConflict: "user_id,roadmap_slug,node_id" }); if (result.error) throw result.error; setStatus("synced"); }
    catch (_) { queueRows(rows); setStatus(navigator.onLine ? "local" : "offline"); }
    const latest = rows.slice(-1)[0];
    pushEvent(slug, "quiz_saved", latest?.node_id || null, { best_score: latest?.best_score || 0, attempts: latest?.attempts || 0, passed: Boolean(latest?.passed) });
  }

  async function resetProgress(slug) {
    localStorage.removeItem(META_PREFIX + slug);
    if (!client || !user) return;
    if (!navigator.onLine) { setStatus("offline"); return; }
    try { const result = await client.from("progress").delete().eq("roadmap_slug", slug); if (result.error) throw result.error; setStatus("synced"); }
    catch (_) { setStatus("offline"); }
  }

  function localSnapshot() {
    const progress = {};
    const quizzes = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("rm_progress_") && !key.startsWith("rm_progress_meta_")) progress[key.replace("rm_progress_", "")] = parse(key, {});
      if (key.startsWith("rm_quiz_")) quizzes[key.replace("rm_quiz_", "")] = parse(key, {});
    });
    return { progress, quizzes };
  }

  async function getSnapshot() {
    if (validConfig()) await loadClient();
    const local = localSnapshot();
    let cloud = null;
    if (client && user) cloud = await fetchCloud();
    return { user, local, cloud, status, queued: parse(QUEUE_KEY, []).length };
  }

  async function flushQueue() {
    if (!client || !user || !navigator.onLine) return;
    const rows = parse(QUEUE_KEY, []);
    if (!rows.length) return;
    try {
      const progress = rows.filter(r => r.kind === "progress").map(r => ({ user_id: user.id, roadmap_slug: r.roadmap_slug, node_id: r.node_id, status: r.status, updated_at: r.updated_at }));
      const quizzes = rows.filter(r => r.kind === "quiz_results").map(r => ({ user_id: user.id, roadmap_slug: r.roadmap_slug, node_id: r.node_id, best_score: r.best_score, attempts: r.attempts, passed: r.passed, updated_at: r.updated_at }));
      const events = rows.filter(r => r.kind === "learning_event").map(r => ({ user_id: user.id, roadmap_slug: r.roadmap_slug, node_id: r.node_id, event_type: r.event_type, metadata: r.metadata || {}, created_at: r.created_at }));
      if (progress.length) { const result = await client.from("progress").upsert(progress, { onConflict: "user_id,roadmap_slug,node_id" }); if (result.error) throw result.error; }
      if (quizzes.length) { const result = await client.from("quiz_results").upsert(quizzes, { onConflict: "user_id,roadmap_slug,node_id" }); if (result.error) throw result.error; }
      if (events.length) { const result = await client.from("learning_events").insert(events); if (result.error) throw result.error; }
      localStorage.removeItem(QUEUE_KEY); setStatus("synced");
    } catch (_) { setStatus("offline"); }
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    ensureUi(); renderUi();
    window.addEventListener("rm:progress-changed", event => pushProgress(event.detail.slug, event.detail.progress));
    window.addEventListener("rm:quiz-changed", event => pushQuiz(event.detail.slug, event.detail.results));
    window.addEventListener("rm:progress-reset", event => resetProgress(event.detail.slug));
    window.addEventListener("rm:language-changed", renderUi);
    window.addEventListener("online", flushQueue);
    if (!validConfig()) return;
    try { await loadClient(); if (user) await mergeAccount(); }
    catch (_) { setStatus("local"); }
  }

  window.RoadmapSync = Object.freeze({ init, refresh: mergeAccount, getUser: () => user, getSnapshot, isConfigured: validConfig });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
