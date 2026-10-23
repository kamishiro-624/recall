/* Core: state, helpers, storage (IndexedDB), card model, scheduling helpers, duplicate detection */
var DAY = 864e5, HOUR = 36e5, GAPS = [0, 1, 3, 7, 14];
var DEFAULTS = { newPerDay: 10, maxReviews: 100, learnSteps: 2, lessonBatch: 5, shuffle: true, dupScope: "deck", aiProvider: "puter", puterModel: "", aiKey: "", aiModel: "claude-sonnet-5-5", gemKey: "", gemModel: "gemini-2.5-flash" };
var DB = { decks: [], cards: [], cur: "all", settings: {}, log: {}, widgets: null }, tab = "dash", sess = null, form = blank(), editDash = false, imp = { direct: [], secs: [], items: [], deck: "", msg: "" };
var CLOZE = /\{\{c\d+::(.*?)(?:::.*?)?\}\}/g;
function $(s, r) { return (r || document).querySelector(s) }
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36) }
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] }) }
function blank() { return { id: "", deck: "", q: "", a: "", img: "", aud: "", ch: ["", "", "", ""], ci: 0, ok: false } }
function say(t) { $("#sr").textContent = t; var m = $("#msg"); if (m) m.textContent = t }
function toast(t) { var e = $("#toast"); if (!e) return; e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { e.hidden = true }, 7000) }
/* storage: IndexedDB so images and audio fit */
function idb() { return new Promise(function (res, rej) { var r = indexedDB.open("recall", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv") }; r.onsuccess = function () { res(r.result) }; r.onerror = function () { rej(r.error) } }) }
async function loadDB() { try { var d = await idb(); var v = await new Promise(function (res) { var q = d.transaction("kv").objectStore("kv").get("db"); q.onsuccess = function () { res(q.result) }; q.onerror = function () { res(null) } }); if (v && v.cards) DB = v } catch (e) { } migrate() }
var tmr;
async function saveLocalNow() { try { var d = await idb(); d.transaction("kv", "readwrite").objectStore("kv").put(DB, "db") } catch (e) { } }
function save() { DB.updated = Date.now(); clearTimeout(tmr); tmr = setTimeout(saveLocalNow, 250); if (typeof cloudDirty === "function") cloudDirty() }
/* deleted cards and decks are remembered (for 90 days) so a deletion on one device also reaches the others */
function markGone(ids) { DB.deleted = DB.deleted || {}; var t = Date.now(); ids.forEach(function (i) { DB.deleted[i] = t }) }
function migrate() {
    DB.settings = DB.settings || {}; if (DB.settings.aiKey && !DB.settings.aiProvider) DB.settings.aiProvider = "claude"; DB.settings = Object.assign({}, DEFAULTS, DB.settings); DB.log = DB.log || {}; DB.deleted = DB.deleted || {}; DB.decks = DB.decks || []; if (!DB.cur) DB.cur = "all";
    DB.cards.forEach(function (c) { if (!c.stage) c.stage = "review"; c.miss = c.miss || 0; c.step = c.step || 0; c.u = c.u || 0 }); normWidgets()
}
/* settings, daily log, stages */
function S() { return DB.settings }
function today(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) }
function lg() { var k = today(); return DB.log[k] || (DB.log[k] = { r: 0, c: 0, l: 0, q: 0 }) }
function lgp(d) { return DB.log[today(d)] || { r: 0, c: 0, l: 0, q: 0 } }
function scoped() { return DB.cards.filter(function (c) { return DB.cur === "all" || c.deck === DB.cur }) }
function inStage(s) { return scoped().filter(function (c) { return c.stage === s }) }
function reviewDue() {
    var n = Date.now(), rem = S().maxReviews > 0 ? Math.max(0, S().maxReviews - lgp().r) : 1e9;
    return inStage("review").filter(function (c) { return c.due <= n }).sort(function (a, b) { return a.due - b.due }).slice(0, rem)
}
function newAllowance() { return Math.max(0, S().newPerDay - lgp().l) }
function lessonCount() { return inStage("learning").length + Math.min(inStage("new").length, newAllowance()) }
/* model */
function deckId(n) { n = (n || "").trim().toLowerCase(); var d = DB.decks.find(function (x) { return x.name.toLowerCase() === n }); return d ? d.id : null }
function ensureDeck(n) { n = (n || "").trim() || "My deck"; var id = deckId(n); if (!id) { id = uid(); DB.decks.push({ id: id, name: n }) } return id }
function deckName(id) { var d = DB.decks.find(function (x) { return x.id === id }); return d ? d.name : "" }
function mk(o, deck) { return { id: uid(), deck: deck, q: o.q || "", a: o.a || "", img: o.img || "", aud: o.aud || "", box: o.box || 1, due: o.due || 0, seen: o.seen || 0, stage: o.stage || "new", step: 0, miss: o.miss || 0, u: Date.now(), ch: o.ch || undefined, ci: o.ci, alt: o.alt || undefined } }
function kind(c) { return /\{\{c\d+::/.test(c.q) ? "fill-in" : (c.ch && c.ch.filter(Boolean).length >= 2) ? "choice" : c.img ? "image" : c.aud ? "audio" : "text" }
/* a multiple-choice card is a flashcard whose answer is picked instead of typed; for plain-text exports the options are listed under the question */
function qText(c) { return kind(c) !== "choice" ? c.q : c.q + "\n" + c.ch.map(function (x, i) { return String.fromCharCode(65 + i) + ") " + x }).join("\n") }
function stageLabel(c) { return c.stage === "review" ? "box " + c.box : c.stage }
function clozeHTML(q, show) { return esc(q).replace(CLOZE, show ? "<mark>$1</mark>" : '<span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>') }
function clozePlain(q) { var a = []; var p = q.replace(CLOZE, function (m, w) { a.push(w); return "_____" }); return { p: p, a: a.join(", ") } }
function media(c) { return (c.img ? '<img class="pic" alt="Card picture" src="' + c.img + '">' : "") + (c.aud ? '<audio controls src="' + c.aud + '"></audio>' : "") }
/* duplicates: same prompt (and same picture/audio) within a deck, or across all decks if chosen in Settings */
function norm(s) { return String(s || "").toLowerCase().replace(/<[^>]*>/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim() }
function fp(u) { return u ? u.length + ":" + u.slice(-40) : "" }
function dkey(c) { return norm(c.q) + "|" + fp(c.img) + "|" + fp(c.aud) }
function findDup(c, did, skipId) {
    var k = dkey(c), all = S().dupScope === "all";
    return DB.cards.find(function (x) { return x.id !== skipId && (all || x.deck === did) && dkey(x) === k })
}
function dupGroups() { var seen = {}, out = []; scoped().forEach(function (c) { var k = (S().dupScope === "all" ? "" : c.deck) + "#" + dkey(c); if (seen[k]) out.push(c); else seen[k] = 1 }); return out }
