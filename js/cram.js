/* Cram mode: a deadline for one deck. Recall spreads the new cards over the days you have, shortens the review gaps so every card
   is seen again before the deadline, and rebuilds the plan from real progress every time you look at it or study.
   Plans live in DB.plans[deckId] = { on, due, mins, created, startLeft, u, day, per, prevPer } and sync with the account. */
function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime() }
function cramPlan(deck) { var p = (DB.plans || {})[deck]; return p && p.on && p.due > Date.now() ? p : null }
function cramActive(deck) { return !!cramPlan(deck) }
function activePlans() { return Object.keys(DB.plans || {}).map(function (id) { return { id: id, p: DB.plans[id] } }).filter(function (x) { return x.p.on && deckName(x.id) }).sort(function (a, b) { return a.p.due - b.p.due }) }
function cramDays(p) { return Math.max(1, Math.round((startOfDay(p.due) - startOfDay(Date.now())) / DAY) + 1) }
function cramLearnDays(p) { var d = cramDays(p); return d <= 1 ? 1 : Math.max(1, Math.floor(d * 0.7)) }   /* the last ~30% of the days are for reviewing, not new cards */
function newLearnedToday(deck) { var ld = lgp().ld; return ld ? (ld[deck] || 0) : 0 }
function nonCramLearned() { var L = lgp(); if (!L.ld) return L.l || 0; var n = 0; Object.keys(L.ld).forEach(function (d) { if (!cramActive(d)) n += L.ld[d] }); return n }
function newAllowance() { return Math.max(0, S().newPerDay - nonCramLearned()) }
function cramQuotaLeft(deck) {
    var p = cramPlan(deck); if (!p) return 0;
    var pending = DB.cards.filter(function (c) { return c.deck === deck && c.stage === "new" }).length, done = newLearnedToday(deck);
    return Math.max(0, Math.ceil((pending + done) / cramLearnDays(p)) - done)
}
/* the new cards that may be introduced today in the current view: cram decks follow their plan, other decks share "new cards per day" */
function newPool() {
    var left = newAllowance(), took = {}, out = [];
    inStage("new").forEach(function (c) {
        if (cramActive(c.deck)) { var q = cramQuotaLeft(c.deck); took[c.deck] = took[c.deck] || 0; if (took[c.deck] < q) { out.push(c); took[c.deck]++ } }
        else if (left > 0) { out.push(c); left-- }
    });
    return out
}
function lessonCount() { return inStage("learning").length + newPool().length }
/* review gaps shrink as the deadline gets closer, and one review always lands a few hours before it */
function cramIvMs(iv, T) { var x = Math.min(iv, Math.max(3 * HOUR, T * 0.5)); if (T > 10 * HOUR) x = Math.min(x, T - 5 * HOUR); return Math.max(20 * 60000, x) }
function cramIv(c, iv) { var p = cramPlan(c.deck); return p ? cramIvMs(iv, p.due - Date.now()) : iv }
/* once a day: remember today's target so the plan can say how it changed */
function cramRefresh() {
    var changed = false; Object.keys(DB.plans || {}).forEach(function (id) {
        var p = DB.plans[id]; if (!p.on || p.day === today()) return;
        p.prevPer = p.per; p.day = today(); p.per = cramQuotaLeft(id) + newLearnedToday(id); p.u = Date.now(); changed = true
    });
    if (changed) save()
}
function deckPaceSecs(deck) {
    var cs = DB.cards.filter(function (c) { return c.deck === deck }), mc = cs.filter(function (c) { return kind(c) === "choice" }).length, f = cs.length ? mc / cs.length : 0;
    return f * paceOf("choice") + (1 - f) * paceOf("typed")
}
/* the plan: simulate day by day, assuming cards are answered correctly, using the same shrinking gaps the scheduler will use */
function cramAnalyze(deck, p) {
    var now = Date.now(), cs = DB.cards.filter(function (c) { return c.deck === deck }), L = S().learnSteps, per = deckPaceSecs(deck);
    var st = { total: cs.length, fresh: cs.filter(function (c) { return c.stage === "new" }).length, learning: cs.filter(function (c) { return c.stage === "learning" }).length, review: cs.filter(function (c) { return c.stage === "review" }).length };
    st.left = st.fresh + st.learning; st.mastered = cs.filter(function (c) { return c.stage === "review" && c.box >= 4 }).length;
    var days = cramDays(p), D = cramLearnDays(p), learnedToday = newLearnedToday(deck), target = Math.ceil((st.fresh + learnedToday) / D), rows = [], pend = st.fresh, start = startOfDay(now);
    var rv = cs.filter(function (c) { return c.stage === "review" }).map(function (c) { return { due: Math.max(c.due, now), box: c.box } });
    var teach = paceOf("teach"), newSecs = teach + L * per * 1.25, learnNow = 0; cs.filter(function (c) { return c.stage === "learning" }).forEach(function (c) { learnNow += Math.max(1, L - c.step) * per * 1.25 });
    for (var i = 0; i < days && i < 60; i++) {
        var ds = start + i * DAY, de = ds + DAY, newN = i < D ? (i === 0 ? Math.max(0, target - learnedToday) : target) : 0; newN = Math.min(newN, pend); pend -= newN;
        for (var k = 0; k < newN; k++) rv.push({ due: i === 0 ? now + cramIvMs(4 * HOUR, p.due - now) : ds + 10 * HOUR, box: 1 });
        var revs = 0;
        rv.forEach(function (x) { while (x.due < de && x.due < p.due) { revs++; x.box = Math.min(5, x.box + 1); x.due += cramIvMs((GAPS[x.box - 1] || 0.25) * DAY, p.due - x.due) } });
        var secs = newN * newSecs + revs * per + (i === 0 ? learnNow : 0);
        rows.push({ date: ds, newN: newN, reviews: revs, min: Math.max(0, Math.round(secs / 60)), last: i === days - 1 })
    }
    var over = p.mins ? rows.filter(function (r) { return r.min > p.mins }).length : 0, maxMin = rows.reduce(function (m, r) { return Math.max(m, r.min) }, 0);
    /* are you where a steady plan would have you by now? */
    var learnEnd = p.created + Math.max(DAY / 2, (p.due - p.created) * 0.7), frac = Math.min(1, Math.max(0, (now - p.created) / (learnEnd - p.created))), expected = (p.startLeft || st.left) * (1 - frac), tol = Math.max(2, Math.round((p.startLeft || st.left) * 0.1)), status = "ok";
    if (st.left === 0) status = "done"; else if (st.left > expected + tol) status = "behind"; else if (st.left < expected - tol) status = "ahead";
    return { st: st, rows: rows, days: days, learnDays: D, target: target, todayLeft: cramQuotaLeft(deck), over: over, maxMin: maxMin, status: status, expected: Math.round(expected), per: per }
}
/* ---- screen ---- */
var CRAM = { deck: "", msg: "" };
function cramDeck() {
    if (CRAM.deck && DB.decks.some(function (d) { return d.id === CRAM.deck })) return CRAM.deck;
    var a = activePlans(); if (a.length) return a[0].id; if (DB.cur !== "all" && deckName(DB.cur)) return DB.cur; return DB.decks[0] ? DB.decks[0].id : ""
}
function localInput(ts) { var d = new Date(ts), z = function (n) { return ("0" + n).slice(-2) }; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "T" + z(d.getHours()) + ":" + z(d.getMinutes()) }
function dueText(ts) { var ms = ts - Date.now(); if (ms <= 0) return "passed"; var h = ms / HOUR; return h < 36 ? "in " + Math.max(1, Math.round(h)) + " hours" : "in " + Math.round(h / 24) + " days" }
function dayLabel(ts, i, last) {
    var d = new Date(ts), nm = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1);
    return (i === 0 ? "Today" : i === 1 ? "Tomorrow" : nm) + (last ? " \u2013 deadline" : "")
}
function statusLine(a, p) {
    var st = a.st;
    if (st.left === 0) return ["ok", "Every card has been learned. From here it is about seeing them again before the deadline, which the review days do for you."];
    if (a.status === "behind") return ["bad", "You are a little behind: " + st.left + " cards still to learn where a steady plan would have about " + a.expected + ". The daily target was raised to catch up."];
    if (a.status === "ahead") return ["ok", "You are ahead of a steady plan. The extra time goes to reviewing."];
    return ["ok", "On track. Keep to about " + a.target + " new cards a day."]
}
/* "Skip what I already know": mark cards as known up front, so the plan only has to teach the rest */
function knowHTML(deck) {
    var cs = DB.cards.filter(function (c) { return c.deck === deck && (c.stage === "new" || c.stage === "learning") });
    if (!cs.length) return "";
    return '<details class="adv" id="kdet" style="margin-top:12px"><summary>Skip what I already know (' + cs.length + ' cards not learned yet)</summary><p class="hint">Tick the cards you already know well. They skip learning and come back for review in a few days (sooner as the deadline gets close), so the plan needs fewer new cards a day.</p>' +
        '<input type="search" id="ksq" placeholder="Search these cards" aria-label="Search cards"><div class="bulkbar"><label class="inl"><input type="checkbox" id="kall"> Select all shown</label><span class="hint" id="kct"></span><span class="grow"></span><button class="primary sm" id="kgo" type="button" disabled>Mark as known</button></div><div id="klist" class="review"></div></details>'
}
function knowWire(deck) {
    var sel = {}, q = "";
    function list() { var qq = q.toLowerCase().trim(); return DB.cards.filter(function (c) { return c.deck === deck && (c.stage === "new" || c.stage === "learning") && (!qq || (qText(c) + " " + (c.a || "")).toLowerCase().indexOf(qq) > -1) }).slice(0, 300) }
    function counts() {
        var l = list(), n = Object.keys(sel).filter(function (k) { return sel[k] }).length;
        $("#kct").textContent = n ? n + " selected" : "None selected"; $("#kgo").disabled = !n; $("#kgo").textContent = n ? "Mark " + n + " as known" : "Mark as known";
        var shown = l.filter(function (c) { return sel[c.id] }).length; $("#kall").checked = l.length > 0 && shown === l.length; $("#kall").indeterminate = shown > 0 && shown < l.length
    }
    function paint() {
        var l = list();
        $("#klist").innerHTML = l.length ? l.map(function (c) { return '<div class="item"><input type="checkbox" data-k="' + c.id + '" aria-label="I know this card"' + (sel[c.id] ? " checked" : "") + '><div class="body"><div>' + esc(c.q.replace(/\n/g, " ")) + '</div><div class="a">' + esc((c.a || "").replace(/\n/g, " ")) + '</div></div></div>' }).join("") : '<p class="hint">No cards match.</p>';
        counts();
        $("#klist").querySelectorAll("[data-k]").forEach(function (b) { b.onchange = function () { if (b.checked) sel[b.dataset.k] = true; else delete sel[b.dataset.k]; counts() } })
    }
    $("#kdet").addEventListener("toggle", function () { if (this.open) paint() });
    $("#ksq").oninput = function () { q = this.value; Object.keys(sel).forEach(function (k) { if (!list().some(function (c) { return c.id === k })) delete sel[k] }); paint() };
    $("#kall").onchange = function () { var on = this.checked; list().forEach(function (c) { if (on) sel[c.id] = true; else delete sel[c.id] }); paint() };
    $("#kgo").onclick = async function () {
        var ids = Object.keys(sel).filter(function (k) { return sel[k] }), p = DB.plans[deck]; if (!ids.length) return;
        if (!(await askConfirm({ title: "Mark " + ids.length + " card" + (ids.length === 1 ? "" : "s") + " as already known?", body: "They skip learning and start at level 3, so their first review is a few days away (sooner as the deadline gets close). The plan is recalculated for the cards that are left.", ok: "Mark as known" }))) return;
        var before = cramAnalyze(deck, p).target; DB.cards.forEach(function (c) { if (sel[c.id]) knowCard(c) }); save();
        var after = cramAnalyze(deck, p); toast(ids.length + " card" + (ids.length === 1 ? "" : "s") + " marked as known. The plan now needs " + after.target + " new cards a day" + (before !== after.target ? " (was " + before + ")" : "") + "."); render()
    }
}
function cramView(v) {
    if (!DB.decks.length) { v.innerHTML = emptyPanel(); wire(v); return }
    cramRefresh(); var deck = cramDeck(), p = (DB.plans || {})[deck], live = p && p.on, ended = live && p.due <= Date.now(), a = live && !ended ? cramAnalyze(deck, p) : null;
    var def = p && p.due > Date.now() ? p.due : (function () { var d = new Date(Date.now() + 6 * DAY); d.setHours(8, 0, 0, 0); return d.getTime() })();
    var h = '<div class="panel enter"><h2>Cram mode</h2><p class="hint" style="margin-top:0">Choose a deck and the day you need to know it by. Recall spreads the new cards over the days you have, brings every card back before the deadline, and rebuilds the plan from your real progress each time you study.</p>' +
        '<label for="cdeck">Deck</label><select id="cdeck">' + DB.decks.map(function (d) { var pl = (DB.plans || {})[d.id]; return '<option value="' + d.id + '"' + (d.id === deck ? " selected" : "") + '>' + esc(d.name) + (pl && pl.on && pl.due > Date.now() ? " (deadline " + dueText(pl.due) + ")" : "") + '</option>' }).join("") + '</select>';
    if (ended) h += '<p class="fl-last">The deadline for this deck has passed. ' + (function () { var cs = DB.cards.filter(function (c) { return c.deck === deck }), l = cs.filter(function (c) { return c.stage === "review" }).length; return "You had learned " + l + " of " + cs.length + " cards." })() + ' Set a new deadline below to start another plan.</p>';
    h += '<label for="cdue">Deadline (the test, quiz or exam)</label><input type="datetime-local" id="cdue" min="' + localInput(Date.now() + 30 * 60000) + '" value="' + localInput(def) + '">' +
        '<label for="cmins">Minutes you can study per day (optional)</label><input type="number" id="cmins" min="0" max="600" placeholder="No limit" value="' + (p && p.mins ? p.mins : "") + '"><p class="hint" style="margin:4px 0 0">If you give a number, the plan tells you whether it fits.</p>' +
        '<p class="hint fl-err" id="cerr" role="status">' + esc(CRAM.msg) + '</p><div class="row"><button class="primary" id="csave" type="button">' + (a ? "Update the plan" : "Create the plan") + '</button>' + (live ? '<button class="danger" id="cdel" type="button">Remove this plan</button>' : "") + '</div></div>';
    if (a) {
        var sl = statusLine(a, p), mn = a.rows[0] ? a.rows[0].min : 0;
        h += '<div class="panel enter"><h2>Your plan for ' + esc(deckName(deck)) + '</h2><p class="fl-last mc-fb ' + sl[0] + '" style="margin-top:0">' + esc(sl[1]) + '</p>' +
            '<div class="fl-stats"><div><b>' + dueText(p.due).replace(/^in /, "") + '</b><span>until the deadline</span></div><div><b>' + a.st.left + '</b><span>cards still to learn</span></div><div><b>' + a.todayLeft + '</b><span>new cards to learn today</span></div><div><b>' + (mn ? "~" + mn : "<1") + '</b><span>minutes today</span></div></div>' +
            (p.prevPer && p.per !== p.prevPer ? '<p class="hint">Today\'s target is ' + p.per + ' new cards (it was ' + p.prevPer + ' yesterday), because the plan is rebuilt from your progress.</p>' : "") +
            (p.mins ? (a.over ? '<p class="fl-last mc-fb bad">' + a.over + ' of the days need more than your ' + p.mins + ' minutes (up to about ' + a.maxMin + ' minutes). To fit, study more on those days, move the deadline, or accept that the last cards may only get one pass.</p>' : '<p class="fl-last mc-fb ok">Every day fits inside your ' + p.mins + ' minutes.</p>') : "") +
            '<div class="row"><button class="primary" id="cgo" type="button">Study ' + esc(deckName(deck)) + ' now</button></div>' +
            '<h3>Day by day</h3><div class="plan-wrap"><table class="plan"><thead><tr><th>Day</th><th>Learn</th><th>Review</th><th>Time</th></tr></thead><tbody>' +
            a.rows.slice(0, 21).map(function (r, i) { return '<tr' + (i === 0 ? ' class="now"' : "") + (p.mins && r.min > p.mins ? ' class="over"' : "") + '><td>' + dayLabel(r.date, i, r.last) + '</td><td>' + (r.newN ? r.newN + " new" : "\u2013") + '</td><td>' + (r.reviews ? "~" + r.reviews : "\u2013") + '</td><td>~' + r.min + ' min</td></tr>' }).join("") + '</tbody></table></div>' +
            (a.rows.length > 21 ? '<p class="hint">Showing the first 21 of ' + a.rows.length + ' days.</p>' : "") +
            '<p class="hint">Review counts assume you answer correctly; missed cards come back sooner and add a little time. Review gaps shrink toward the deadline, and a final review lands about five hours before it.</p>' + knowHTML(deck) + '</div>'
    }
    v.innerHTML = h;
    $("#cdeck").onchange = function () { CRAM.deck = this.value; CRAM.msg = ""; render() };
    $("#csave").onclick = function () {
        var due = new Date($("#cdue").value).getTime(), mins = Math.max(0, Math.round(+$("#cmins").value || 0));
        if (!(due > Date.now() + 30 * 60000)) { CRAM.msg = "Pick a deadline that is at least half an hour from now."; $("#cerr").textContent = CRAM.msg; return }
        CRAM.msg = ""; var cs = DB.cards.filter(function (c) { return c.deck === deck }), left = cs.filter(function (c) { return c.stage !== "review" }).length;
        DB.plans = DB.plans || {}; var old = DB.plans[deck];
        DB.plans[deck] = { on: true, due: due, mins: mins, created: old && old.on && old.due > Date.now() ? old.created : Date.now(), startLeft: old && old.on && old.due > Date.now() ? Math.max(old.startLeft || 0, left) : left, u: Date.now(), day: "", per: 0, prevPer: old && old.on ? old.per : null };
        cramRefresh(); save(); toast(a ? "Plan updated." : "Cram plan created. Today's new cards now follow it."); render()
    };
    if ($("#cdel")) $("#cdel").onclick = async function () {
        if (!(await askConfirm({ title: "Remove the cram plan for \u201c" + deckName(deck) + "\u201d?", body: "New cards and reviews for this deck go back to your normal daily limits. Your cards and progress are kept.", ok: "Remove plan", danger: true }))) return;
        DB.plans[deck] = { on: false, due: DB.plans[deck].due, u: Date.now() }; save(); render()
    };
    if ($("#cgo")) $("#cgo").onclick = function () { DB.cur = deck; save(); startStudy() };
    if ($("#kdet")) knowWire(deck)
}
