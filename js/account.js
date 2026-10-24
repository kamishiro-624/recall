/* Accounts and saving online. Uses Puter (the same free service as the AI option): the person signs in with a Puter account
   in a pop-up, and their decks, cards, progress and settings are saved as one file in THEIR OWN Puter storage.
   The copy on this device always works without an account; signing in adds a second copy that follows you to other computers.
   API keys are never saved online. */
var CLOUD_FILE = "recall-cards.json";
var ACCT = { user: "", state: "off", msg: "", at: 0, dirty: false, busy: false, again: false, tm: 0, other: "" };
var SECRETS = ["aiKey", "gemKey", "acct", "acctDismiss"];
function agoText(t) { var m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : Math.round(m / 60) + " h ago" }
/* ---- merging two copies (this device and the saved one) ---- */
function mergeInto(L, R) {
  var chg = { local: false, cloud: false }, now = Date.now(), del = {};
  [L.deleted || {}, R.deleted || {}].forEach(function (m) { Object.keys(m).forEach(function (k) { del[k] = Math.max(del[k] || 0, m[k]) }) });
  Object.keys(del).forEach(function (k) { if (now - del[k] > 90 * DAY) delete del[k] });
  if (Object.keys(del).length !== Object.keys(R.deleted || {}).length) chg.cloud = true;
  L.deleted = del;
  var map = {};
  (R.decks || []).forEach(function (d) {
    if (del[d.id]) return;
    var same = L.decks.find(function (x) { return x.id === d.id }); if (same) { map[d.id] = same.id; return }
    var byName = L.decks.find(function (x) { return x.name.toLowerCase() === d.name.toLowerCase() });
    if (byName) { map[d.id] = byName.id; chg.cloud = true; return }
    L.decks.push({ id: d.id, name: d.name }); map[d.id] = d.id; chg.local = true
  });
  var nd = L.decks.length; L.decks = L.decks.filter(function (d) { return !del[d.id] }); if (L.decks.length !== nd) chg.local = true;
  var byId = {}; L.cards.forEach(function (c) { byId[c.id] = c });
  (R.cards || []).forEach(function (rc) {
    if (del[rc.id]) return;
    rc = Object.assign({}, rc); rc.deck = map[rc.deck] || rc.deck;
    var lc = byId[rc.id];
    if (!lc) { L.cards.push(rc); byId[rc.id] = rc; chg.local = true; return }
    if ((rc.u || 0) > (lc.u || 0)) { Object.assign(lc, rc); chg.local = true } else if ((rc.u || 0) < (lc.u || 0)) chg.cloud = true
  });
  var rids = {}; (R.cards || []).forEach(function (c) { rids[c.id] = 1 });
  var nc = L.cards.length; L.cards = L.cards.filter(function (c) { return !del[c.id] }); if (L.cards.length !== nc) chg.local = true;
  L.cards.forEach(function (c) { if (!rids[c.id]) chg.cloud = true });
  L.log = L.log || {};
  Object.keys(R.log || {}).forEach(function (k) {
    var a = L.log[k], b = R.log[k];
    if (!a) { L.log[k] = Object.assign({}, b); chg.local = true } else["r", "c", "l", "q"].forEach(function (f) { if ((b[f] || 0) > (a[f] || 0)) { a[f] = b[f]; chg.local = true } else if ((b[f] || 0) < (a[f] || 0)) chg.cloud = true })
  });
  Object.keys(L.log).forEach(function (k) { if (!(R.log || {})[k]) chg.cloud = true });
  if ((R.updated || 0) > (L.updated || 0)) {
    var keep = {}; SECRETS.forEach(function (k) { if (L.settings[k] !== undefined) keep[k] = L.settings[k] });
    L.settings = Object.assign({}, DEFAULTS, R.settings || {}, keep); if (R.widgets) L.widgets = R.widgets; L.updated = R.updated; chg.local = true
  }
  return chg
}
function cloudPayload() {
  var s = Object.assign({}, DB.settings); SECRETS.forEach(function (k) { delete s[k] });
  return { format: "recall-cloud", v: 1, updated: DB.updated || Date.now(), owner: ACCT.user, decks: DB.decks, cards: DB.cards, deleted: DB.deleted || {}, log: DB.log, settings: s, widgets: DB.widgets }
}
async function cloudRead(p) {
  var items = await p.fs.readdir("./");
  if (!items.some(function (i) { return i.name === CLOUD_FILE })) return null;
  var blob = await p.fs.read(CLOUD_FILE), j = JSON.parse(await blob.text());
  if (!j || j.format !== "recall-cloud") throw new Error("The saved file isn't in the expected format, so Recall left it alone.");
  return j
}
/* ---- one sync: read the saved copy, merge, save the result back ---- */
async function cloudSync(why) {
  if (!ACCT.user) return;
  if (ACCT.busy) { ACCT.again = true; return }
  /* background saves are silent (only the small dot next to your name changes); loading and "Save now" show a progress bar */
  var loud = why === "pull" || why === "push", shown = false, barT = 0;
  ACCT.busy = true; clearTimeout(ACCT.tm); ACCT.state = "syncing"; acctPaint();
  if (loud) barT = setTimeout(function () { shown = true; progSet("sync", null, why === "pull" ? "Loading your saved cards\u2026" : "Saving to your account\u2026", true) }, why === "pull" ? 900 : 0);
  try {
    var p = await aiLoadPuter(), remote = await cloudRead(p), chg = { local: false, cloud: false };
    if (remote) chg = mergeInto(DB, remote);
    if (chg.local) { DB.cards.forEach(function (c) { if (!c.stage) c.stage = "review"; c.u = c.u || 0 }); normWidgets(); await saveLocalNow() }
    if (ACCT.dirty || !remote || chg.cloud) { ACCT.dirty = false; await p.fs.write(CLOUD_FILE, JSON.stringify(cloudPayload()), { overwrite: true, dedupeName: false, createMissingParents: true }) }
    ACCT.at = Date.now(); ACCT.state = "saved"; ACCT.msg = "";
    clearTimeout(barT); if (shown) { progDone("sync", "Saved to your account"); setTimeout(function () { if (!ACCT.busy) progHide("sync") }, 1200) } else progHide("sync")
    if (chg.local) { applyTheme(); applyFx() }
    if (chg.local) { if (tab === "study" || tab === "import" || tab === "add") shell(); else render() }
  } catch (e) {
    clearTimeout(barT); ACCT.state = "error"; ACCT.dirty = true; ACCT.msg = "Couldn't reach your account (" + aiErr(e, "no connection") + "). Your cards are safe on this device and will save when the connection is back.";
    progHide("sync"); ACCT.tm = setTimeout(function () { cloudSync("auto") }, 60000)
  } finally { ACCT.busy = false; acctPaint(); if (ACCT.again) { ACCT.again = false; cloudDirty() } }
}
function cloudDirty() { ACCT.dirty = true; if (!ACCT.user || ACCT.state === "choose") return; clearTimeout(ACCT.tm); ACCT.tm = setTimeout(function () { cloudSync("auto") }, 15000); acctPaint() }
/* save right away at natural stopping points (pausing, finishing a session, closing the tab) */
function cloudFlush() { if (ACCT.user && ACCT.dirty && ACCT.state !== "choose" && !ACCT.busy) { clearTimeout(ACCT.tm); cloudSync("auto") } }
/* ---- signing in and out ---- */
async function acctReady(name) {
  ACCT.user = name; DB.settings.acct = name;
  if (DB.cards.length && DB.owner && DB.owner !== name) { ACCT.state = "choose"; ACCT.other = DB.owner; acctPaint(); return }
  DB.owner = name; await saveLocalNow(); await cloudSync("pull")
}
async function acctSignIn() {
  progSet("sync", null, "Opening the sign-in window\u2026", true); ACCT.msg = "";
  try {
    var p = await aiLoadPuter();
    if (!(await p.auth.isSignedIn())) { progSet("sync", null, "Waiting for you to sign in in the Puter window\u2026", true); await p.auth.signIn() }
    var u = await p.auth.getUser(); await acctReady(u.username)
  } catch (e) { progHide("sync"); ACCT.state = ACCT.user ? ACCT.state : "out"; ACCT.msg = aiErr(e, "The sign-in didn't finish.") + " If no window opened, allow pop-ups for this page and try again."; acctPaint() }
}
async function acctChoose(useAccount) {
  if (useAccount) { markGone([]); DB.cards = []; DB.decks = []; DB.log = {}; DB.deleted = {}; DB.cur = "all"; sess = null }
  DB.owner = ACCT.user; ACCT.state = "off"; await saveLocalNow(); await cloudSync("pull")
}
async function acctSignOut(clear) {
  progSet("sync", null, "Signing out\u2026", true);
  try { if (ACCT.dirty && ACCT.state !== "choose") await cloudSync("push"); var p = await aiLoadPuter(); await p.auth.signOut() } catch (e) { }
  clearTimeout(ACCT.tm); ACCT.user = ""; ACCT.state = "off"; ACCT.dirty = false; delete DB.settings.acct;
  if (clear) { DB.cards = []; DB.decks = []; DB.log = {}; DB.deleted = {}; DB.owner = ""; DB.cur = "all"; DB.widgets = null; normWidgets(); sess = null }
  await saveLocalNow(); progHide("sync"); tab = "dash"; render()
}
async function acctBoot() {
  if (!DB.settings.acct) return;
  ACCT.user = DB.settings.acct; ACCT.state = "syncing"; acctPaint();
  try {
    var p = await aiLoadPuter();
    if (await p.auth.isSignedIn()) { var u = await p.auth.getUser(); await acctReady(u.username) }
    else { ACCT.user = ""; ACCT.state = "out"; ACCT.msg = "You were signed out. Sign in again to keep saving online."; progHide("sync"); acctPaint() }
  } catch (e) { ACCT.state = "error"; ACCT.msg = "Couldn't reach your account. Your cards are safe on this device."; progHide("sync"); acctPaint() }
}
function openAccount() { tab = "set"; render(); var e = document.getElementById("acctpanel"); if (e && e.scrollIntoView) e.scrollIntoView({ behavior: "smooth", block: "start" }) }
/* ---- what people see ---- */
function acctStatus() {
  if (ACCT.state === "syncing") return "Saving\u2026";
  if (ACCT.state === "error") return "Not saved online yet";
  if (ACCT.state === "choose") return "Needs a choice";
  return ACCT.at ? "Saved online " + agoText(ACCT.at) : "Signed in"
}
function acctInner() {
  var h = "<h2>Your account</h2>";
  if (!ACCT.user) {
    return h + '<p>Your cards are saved on this device. Sign in to also save them online, so you can open them on any computer and never lose them.</p><p class="hint">Recall uses Puter for accounts. You create a free account in a pop-up window (with an email or username and a password), and your cards are stored in your own Puter account. Only your decks, cards, progress and settings are saved. API keys never are. If other people use this computer, check your school\'s rules on student accounts first.</p>' +
      (ACCT.msg ? '<p class="hint fl-err">' + esc(ACCT.msg) + '</p>' : "") + '<div class="row"><button class="primary" id="acin" type="button">Sign in or create an account</button></div>'
  }
  if (ACCT.state === "choose") {
    return h + '<p>You are signed in as <b>' + esc(ACCT.user) + '</b>, but the cards on this device were saved by <b>' + esc(ACCT.other) + '</b>. What should Recall do?</p><div class="row"><button class="primary" id="acuse" type="button">Use only my account\'s cards (remove the other cards from this device)</button><button id="acmerge" type="button">Add this device\'s cards to my account</button></div>'
  }
  return h + '<p>Signed in as <b>' + esc(ACCT.user) + '</b>. <span id="acstat" role="status">' + esc(acctStatus()) + '</span></p>' + (ACCT.msg ? '<p class="hint fl-err">' + esc(ACCT.msg) + '</p>' : "") +
    '<p class="hint">Changes save automatically a few seconds after you make them, and whenever you return to this page.</p><div class="row"><button id="acsave" type="button">Save now</button><button id="acout" type="button">Sign out</button></div>' +
    '<details class="adv" style="margin-top:12px"><summary>Using a shared computer?</summary><p class="hint">Signing out keeps a copy of your cards on this device. If other people use this computer, remove it.</p><button id="acclr" type="button">Sign out and remove my cards from this device</button></details>'
}
function acctWire() {
  var on = function (id, fn) { var e = document.getElementById(id); if (e) e.onclick = fn };
  on("acin", acctSignIn); on("acsave", function () { cloudSync("push") }); on("acout", function () { acctSignOut(false) });
  on("acclr", async function () { if (await askConfirm({ title: "Remove your cards from this device?", body: "You will be signed out and the cards on this device are deleted. They stay safe in your online account.", ok: "Sign out and remove", danger: true })) acctSignOut(true) });
  on("acuse", function () { acctChoose(true) }); on("acmerge", function () { acctChoose(false) })
}
function acctPaint() {
  var b = document.getElementById("acct");
  if (b) { b.textContent = ACCT.user || "Sign in"; b.title = ACCT.user ? acctStatus() : "Sign in to save your cards online"; b.className = ACCT.user ? "acct-in" : ""; b.dataset.state = ACCT.user ? ACCT.state : ""; b.setAttribute("aria-label", ACCT.user ? "Account: " + ACCT.user + ". " + acctStatus() : "Sign in") }
  var p = document.getElementById("acctpanel"); if (p) { p.innerHTML = acctInner(); acctWire() }
}
document.addEventListener("visibilitychange", function () {
  if (!ACCT.user || ACCT.state === "choose") return;
  if (document.visibilityState === "hidden") { if (ACCT.dirty) cloudSync("auto") }
  else if (!ACCT.at || Date.now() - ACCT.at > 120000) cloudSync("auto")
});
