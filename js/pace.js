/* Pace and time estimates, accuracy, and practice (set-up screen, rounds, history).
   Time estimates come from how fast THIS person answers (a running average kept per kind of card), so they adjust as the session goes. */
var PACE_DEF = { typed: 20, choice: 10, teach: 20 };
function paceOf(b) { var p = S().pace || {}; return p[b] || PACE_DEF[b] }
function paceUpdate(b, sec) {
    if (!(sec > 0.5) || sec > 120) return;   /* ignore instant clicks and walking away */
    var p = S().pace = S().pace || {}; p[b] = p[b] == null ? sec : p[b] * 0.8 + sec * 0.2; p[b] = Math.max(3, Math.min(90, p[b]))
}
function bucketOf(c) { return kind(c) === "choice" ? "choice" : "typed" }
function cardSecs(c) { return paceOf(bucketOf(c)) }
function learnSecs(c, steps) { return steps * cardSecs(c) * 1.25 }           /* a quarter extra for repeats after a miss */
function newCardSecs(c) { return paceOf("teach") + learnSecs(c, S().learnSteps) }
function secsLeft(s) {
    var t = 0, L = S().learnSteps; s.rq.forEach(function (c) { t += cardSecs(c) });
    if (s.kind === "practice") return t;
    s.quiz.forEach(function (c) { t += learnSecs(c, Math.max(1, L - c.step)) });
    s.pool.forEach(function (c) { t += newCardSecs(c) });
    s.batch.forEach(function (c, i) { if (s.phase === "teach" && i >= s.ti) t += paceOf("teach"); t += learnSecs(c, L) });
    return t
}
function secsToday() {
    var t = 0, L = S().learnSteps; reviewDue().forEach(function (c) { t += cardSecs(c) });
    inStage("learning").forEach(function (c) { t += learnSecs(c, Math.max(1, L - c.step)) });
    newPool().forEach(function (c) { t += newCardSecs(c) }); return t
}
function todayWork() { var rv = reviewDue().length, nl = lessonCount(), secs = secsToday(); return { rv: rv, nl: nl, secs: secs, min: Math.max(1, Math.round(secs / 60)) } }
function fmtTime(sec) { if (sec < 45) return "under a minute"; var m = Math.round(sec / 60); if (m < 60) return "about " + m + " min"; var h = Math.floor(m / 60), r = m % 60; return "about " + h + " h" + (r ? " " + r + " min" : "") }
/* called when a card is graded: records how long the student took */
function paceRecord(c) {
    var s = sess; if (!s || !s.t0) return; var end = kind(c) === "choice" && s.tpick ? s.tpick + 2000 : Date.now();
    paceUpdate(bucketOf(c), (end - s.t0) / 1000)
}
/* ---- accuracy ---- */
function accShow() { return S().showAcc !== false }
function weekAcc() { var r = 0, c = 0; for (var i = 0; i < 7; i++) { var x = lgp(new Date(Date.now() - i * DAY)); r += x.r; c += x.c } return r ? Math.round(c / r * 100) : null }
function accText(res) { var n = res.got + res.shaky + res.miss; return n ? Math.round(res.got / n * 100) + "%" : "\u2013" }
/* ---- practice ---- */
var PRAC = null;
var PRAC_SRC = [["all", "All my cards"], ["learned", "Cards I've learned"], ["missed", "Cards I've missed before"], ["open", "Cards I haven't mastered yet"], ["choice", "Multiple-choice cards only"]];
var PRAC_ORD = [["random", "Random"], ["hardest", "Hardest first (most misses)"], ["weakest", "Weakest first (lowest level)"]];
var PRAC_SIZES = [5, 10, 15, 20, 30, 50];
function pracOpts() { var s = S(); s.prac = Object.assign({ src: "all", size: 20, order: "random" }, s.prac || {}); return s.prac }
function pracPool(o) {
    var cs = scoped().filter(function (c) { switch (o.src) { case "learned": return c.stage === "review"; case "missed": return c.miss > 0; case "open": return !(c.stage === "review" && c.box >= 5); case "choice": return kind(c) === "choice"; default: return true } });
    var rank = function (c) { return c.stage === "new" ? 0 : c.stage === "learning" ? 1 : 1 + c.box };
    if (o.order === "hardest") cs.sort(function (a, b) { return (b.miss - a.miss) || (rank(a) - rank(b)) }); else if (o.order === "weakest") cs.sort(function (a, b) { return (rank(a) - rank(b)) || (b.miss - a.miss) }); else shuffle(cs);
    return cs
}
function roundPlan(n, o) { var size = !o.size || o.size > n ? n : o.size; return { size: size, rounds: size ? Math.ceil(n / size) : 0 } }
async function startPractice() {
    if (live() && sess.kind === "practice") { tab = "study"; render(); return }
    if (live() && !(await askConfirm({ title: "Pause today's study session?", body: "Your answers so far are saved. You can start the session again after practising.", ok: "Start practice" }))) return;
    var o = pracOpts(), pool = pracPool(o); if (!pool.length) { render(); return }
    var pl = roundPlan(pool.length, o);
    PRAC = { pool: pool, size: pl.size, rounds: pl.rounds, next: 0, round: 0, logged: false, entry: { t: Date.now(), n: 0, got: 0, shaky: 0, miss: 0, rounds: 0 } };
    startRound()
}
function startRound() {
    if (!PRAC) return; var chunk = PRAC.pool.slice(PRAC.next, PRAC.next + PRAC.size).filter(alive); if (!chunk.length) { tab = "practice"; render(); return }
    PRAC.next += PRAC.size; PRAC.round++; sess = newSession("practice", chunk); sess.done = 0; sess.prac = { round: PRAC.round, rounds: PRAC.rounds }; tab = "study"; render()
}
function accPanelHTML() {
    if (!accShow()) return '<p class="hint">Your accuracy is hidden. <button class="sm" id="accon" type="button">Show accuracy</button></p>';
    var wa = weekAcc(), last = (DB.plog || [])[0], miss = scoped().filter(function (c) { return c.miss > 0 }).length;
    return '<div class="fl-stats"><div><b>' + (wa == null ? "\u2013" : wa + "%") + '</b><span>review accuracy this week</span></div><div><b>' + (last && last.n ? Math.round(last.got / last.n * 100) + "%" : "\u2013") + '</b><span>last practice' + (last ? " (" + last.n + " cards, " + agoText(last.t) + ")" : "") + '</span></div><div><b>' + miss + '</b><span>cards you have missed before</span></div></div>'
}
function practiceView(v) {
    if (!DB.cards.length) { v.innerHTML = emptyPanel(); wire(v); return }
    var o = pracOpts(), custom = o.custom || (o.size && PRAC_SIZES.indexOf(o.size) < 0);
    v.innerHTML = '<div class="panel enter"><h2>Practice</h2><p class="hint" style="margin-top:0">Go through cards as many times as you like without changing your review schedule. Long sets are split into rounds so you can stop whenever you want.</p>' +
        (live() && sess.kind === "practice" ? '<p class="fl-last">You have a practice round in progress. <button class="sm" data-go="study" type="button">Continue it</button></p>' : "") +
        '<div id="pacc">' + accPanelHTML() + '</div>' +
        '<label for="psrc">Which cards</label><select id="psrc">' + PRAC_SRC.map(function (x) { return '<option value="' + x[0] + '"' + (o.src === x[0] ? " selected" : "") + '>' + x[1] + '</option>' }).join("") + '</select>' +
        '<label for="psz">Cards per round</label><div class="row" style="margin:0"><select id="psz" style="flex:1 1 200px">' + PRAC_SIZES.map(function (n) { return '<option value="' + n + '"' + (!custom && o.size === n ? " selected" : "") + '>' + n + ' cards</option>' }).join("") + '<option value="0"' + (!custom && !o.size ? " selected" : "") + '>Everything in one round</option><option value="custom"' + (custom ? " selected" : "") + '>Another number\u2026</option></select><input type="number" id="pcus" min="1" max="500" value="' + (o.size || 25) + '" aria-label="Number of cards per round" style="flex:0 0 110px"' + (custom ? "" : " hidden") + '></div>' +
        '<label for="pord">Order</label><select id="pord">' + PRAC_ORD.map(function (x) { return '<option value="' + x[0] + '"' + (o.order === x[0] ? " selected" : "") + '>' + x[1] + '</option>' }).join("") + '</select>' +
        '<div class="opts"><label><input type="checkbox" id="pacb"' + (accShow() ? " checked" : "") + '> Show my accuracy while I practice</label></div>' +
        '<p class="fl-last" id="psum" role="status"></p><div class="row"><button class="primary" id="pgo" type="button">Start practice</button><button id="pback" type="button">Back to Today</button></div></div>';
    function sum() {
        var pool = pracPool(o), pl = roundPlan(pool.length, o), est = 0; pool.slice(0, pl.size).forEach(function (c) { est += cardSecs(c) });
        $("#psum").innerHTML = pool.length ? '<b>' + pool.length + ' card' + (pool.length === 1 ? "" : "s") + '</b> match' + (pool.length === 1 ? "es" : "") + '. ' + (pl.rounds > 1 ? pl.rounds + ' rounds of ' + pl.size + ' cards' : 'One round of ' + pl.size + ' card' + (pl.size === 1 ? "" : "s")) + ', ' + fmtTime(est) + ' per round at your pace.' : 'No cards match these choices. Try \u201cAll my cards\u201d.';
        $("#pgo").disabled = !pool.length
    }
    $("#psrc").onchange = function () { o.src = this.value; save(); sum() };
    $("#pord").onchange = function () { o.order = this.value; save(); sum() };
    $("#psz").onchange = function () { var c = $("#pcus"); if (this.value === "custom") { o.custom = true; c.hidden = false; o.size = Math.max(1, +c.value || 25); c.focus() } else { o.custom = false; c.hidden = true; o.size = +this.value } save(); sum() };
    $("#pcus").oninput = function () { o.size = Math.max(1, Math.min(500, Math.round(+this.value) || 1)); save(); sum() };
    $("#pacb").onchange = function () { S().showAcc = this.checked; save(); $("#pacc").innerHTML = accPanelHTML(); wirePacc() };
    function wirePacc() { var b = $("#accon"); if (b) b.onclick = function () { S().showAcc = true; $("#pacb").checked = true; save(); $("#pacc").innerHTML = accPanelHTML(); wirePacc() } }
    wirePacc(); wire(v); sum();
    $("#pgo").onclick = startPractice; $("#pback").onclick = function () { tab = "dash"; render() }
}
function practiceDoneView(v) {
    var s = sess, r = s.res, n = r.got + r.shaky + r.miss, P = PRAC;
    if (!s.logged) {
        s.logged = true;
        if (P) { var e = P.entry; e.n += n; e.got += r.got; e.shaky += r.shaky; e.miss += r.miss; e.rounds++; if (!P.logged) { P.logged = true; DB.plog = [e].concat(DB.plog || []).slice(0, 30) } save() }
    }
    var left = P ? Math.max(0, P.pool.length - P.next) : 0, more = left > 0, nextN = P ? Math.min(P.size, left) : 0, est = 0;
    if (more) P.pool.slice(P.next, P.next + nextN).forEach(function (c) { est += cardSecs(c) });
    var tot = P ? P.entry : { n: n, got: r.got }, showAcc = accShow(), pctNow = n ? Math.round(r.got / n * 100) : 0, pctAll = tot.n ? Math.round(tot.got / tot.n * 100) : 0;
    v.innerHTML = flowHeader(s) + '<div class="panel enter"><h2>' + (more ? "Round " + P.round + " of " + P.rounds + " done" : P && P.rounds > 1 ? "All " + P.rounds + " rounds done" : "Practice complete") + '</h2><div class="fl-stats"><div><b data-count="' + n + '">' + n + '</b><span>answers this round</span></div>' + (showAcc ? '<div><b data-count="' + pctNow + '">' + pctNow + '</b><span>% right this round</span></div>' + (P && P.rounds > 1 ? '<div><b data-count="' + pctAll + '">' + pctAll + '</b><span>% right so far</span></div>' : "") : "") + '</div><p>Remembered ' + r.got + ', shaky ' + r.shaky + ', missed ' + r.miss + '.' + (showAcc ? "" : ' <button class="sm" id="accon2" type="button">Show accuracy</button>') + '</p>' +
        (P && P.rounds > 1 ? '<div class="fl-prog"><div class="meta ui"><span>Practised ' + Math.min(P.next, P.pool.length) + ' of ' + P.pool.length + ' cards</span><span>' + Math.round(Math.min(P.next, P.pool.length) / P.pool.length * 100) + '%</span></div><div class="bar"><i style="width:' + Math.round(Math.min(P.next, P.pool.length) / P.pool.length * 100) + '%"></i></div></div>' : "") +
        '<p class="hint">Practice doesn\'t change your schedule.</p><div class="row">' + (more ? '<button class="primary" data-go="pracnext" type="button">Start round ' + (P.round + 1) + ' (' + nextN + ' card' + (nextN === 1 ? "" : "s") + ', ' + fmtTime(est) + ')</button><button id="bk" type="button">Stop here</button>' : '<button class="primary" id="bk" type="button">Back to Today</button><button data-go="practice" type="button">Practise again</button>') + '</div></div>';
    wireHead(v); wire(v); $("#bk").onclick = function () { sess = null; tab = "dash"; render(); cloudFlush() };
    var a2 = $("#accon2"); if (a2) a2.onclick = function () { S().showAcc = true; save(); render() };
    fxCount(v); if (n > 0 && pctNow >= 60) { fxConfetti(); sfx("win") }
}
