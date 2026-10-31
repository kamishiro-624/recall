/* Study: ONE guided session. Reviews that are due come first, then new cards (meet them, then a short quiz on them).
   The session stays in memory, so leaving and coming back resumes it. Progress is saved after every answer. */
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t } return a }
function front(c) { return kind(c) === "fill-in" ? clozeHTML(c.q, false) : (c.q ? esc(c.q) : "What is this?") }
function back(c) { return kind(c) === "fill-in" ? clozeHTML(c.q, true) + (c.a ? "\n" + esc(c.a) : "") : esc(c.a) }
function alive(c) { return DB.cards.indexOf(c) > -1 }
function whenText(t) {
    var m = Math.round((t - Date.now()) / 60000); if (m < 60) return "in under an hour";
    var h = Math.round(m / 60); if (h < 24) return "in " + h + (h === 1 ? " hour" : " hours");
    var d = Math.round(h / 24); return d === 1 ? "tomorrow" : "in " + d + " days"
}
/* progress numbers shared by Today, the progress widget and the end-of-session summary */
function stats(cs) {
    var o = { total: cs.length, fresh: 0, learning: 0, reviewing: 0, mastered: 0 };
    cs.forEach(function (c) { if (c.stage === "new") o.fresh++; else if (c.stage === "learning") o.learning++; else if (c.box >= 5) o.mastered++; else o.reviewing++ });
    o.learned = o.reviewing + o.mastered; o.pct = o.total ? Math.round(o.learned / o.total * 100) : 0; return o
}
function nextDueTime() { var n = Date.now(), t = 1e18; inStage("review").forEach(function (c) { if (c.due > n && c.due < t) t = c.due }); return t < 1e18 ? t : 0 }
function live() { return !!(sess && sess.phase && sess.phase !== "done") }
function remaining(s) {
    if (s.kind === "practice") return s.rq.length;
    return s.rq.filter(function (c) { return !s.again[c.id] }).length + s.pool.length + s.batch.length + s.quiz.length
}
function newSession(kind, rq) { return { kind: kind, phase: "review", rq: rq, again: {}, pool: [], batch: [], quiz: [], ti: 0, r: 0, mine: "", draft: "", last: "", res: { miss: 0, shaky: 0, got: 0 }, combo: 0, lastWin: "", revTotal: rq.length, revDone: 0, newTotal: 0, grads: 0, up: 0, taught: 0, teachNext: true, t0: 0, tpick: 0, tt0: 0 } }
/* start */
function startStudy(extra) {
    if (live()) { tab = "study"; render(); return }
    var rev = reviewDue(); if (S().shuffle) rev = shuffle(rev.slice());
    var pool = extra ? inStage("new").slice(0, Math.max(1, S().lessonBatch)) : newPool(), quiz = inStage("learning");
    if (!rev.length && !pool.length && !quiz.length) { sess = null; tab = "dash"; render(); return }
    var s = newSession("today", extra ? [] : rev); s.pool = pool; s.quiz = shuffle(quiz.slice()); s.newTotal = pool.length + quiz.length; sess = s;
    nextStep(); tab = "study"; render()
}
/* the session moves forward in one place: reviews, then (teach a batch, quiz it) until every new card is learned */
function nextStep() {
    var s = sess; s.r = 0; s.mine = ""; s.draft = ""; s.order = null; s.pick = -1; s.t0 = 0; s.tpick = 0;
    s.rq = s.rq.filter(alive); s.quiz = s.quiz.filter(alive);
    if (s.rq.length) { s.phase = "review"; return }
    if (s.kind === "practice") { s.phase = "done"; return }
    if (s.pool.length && (s.teachNext || !s.quiz.length)) {
        s.teachNext = false; s.batch = s.pool.splice(0, Math.max(1, S().lessonBatch));
        s.batch.forEach(function (c) { c.stage = "learning"; c.step = 0; c.u = Date.now(); var Lg = lg(); Lg.l++; Lg.ld = Lg.ld || {}; Lg.ld[c.deck] = (Lg.ld[c.deck] || 0) + 1 }); s.taught += s.batch.length; s.phase = "teach"; s.ti = 0; save(); return
    }
    s.phase = s.quiz.length ? "quiz" : "done"
}
function fxAfter(s) {
    if (s.lastWin === "learned") { fxBurst($(".fl-last"), true); sfx("win") } else if (s.lastWin === "level") { fxBurst($(".fl-last")); sfx("win") }
    if (s.combo >= 3 && s.combo % 5 === 0) { fxBurst($(".combo"), true); sfx("win") }
}
function gradeReview(c, r, note) {
    var s = sess, retry = !!s.again[c.id], sched = s.kind === "today" && !retry, info = "", lvl = false; c.u = Date.now(); paceRecord(c);
    if (sched) {
        var L = lg(); L.r++; c.seen++;
        if (r === 3) { var b0 = c.box; c.box = Math.min(5, c.box + 1); L.c++; if (c.box > b0) { s.up++; lvl = true } } else if (r === 1) { c.box = 1; c.miss++ }
        c.due = Date.now() + cramIv(c, r === 1 ? 15 * 60000 : (GAPS[c.box - 1] || 0.25) * DAY);
        info = r === 1 ? "Missed. You'll see it once more before you finish." : (r === 3 ? (lvl ? "Level up! " : "Got it. ") : "Shaky. ") + "Next review " + whenText(c.due) + "."
    } else info = retry ? "Second try recorded." : "Marked to try once more before you finish.";
    if (!retry) { s.res[r === 3 ? "got" : r === 2 ? "shaky" : "miss"]++; if (s.kind === "today") s.revDone++; else s.done++ }
    s.rq.shift(); if (r === 1 && !retry) { s.again[c.id] = 1; s.rq.push(c) }
    s.last = "Last card: " + (note ? note + " " : "") + info; s.combo = r === 3 ? s.combo + 1 : 0; s.lastWin = lvl ? "level" : ""; nextStep(); save(); render(); fxAfter(s)
}
function gradeLearn(c, r, note) {
    var s = sess; lg().q++; c.u = Date.now(); s.lastWin = ""; paceRecord(c);
    if (r === 3) {
        c.step++; s.res.got++;
        if (c.step >= S().learnSteps) { c.stage = "review"; c.box = 1; c.due = Date.now() + cramIv(c, 4 * HOUR); s.grads++; s.quiz.shift(); s.lastWin = "learned"; s.last = "Learned! Its first review is " + whenText(c.due) + "." }
        else { s.quiz.push(s.quiz.shift()); s.last = "Correct " + c.step + " of " + S().learnSteps + ". It comes back once more." }
    } else { c.step = 0; if (r === 1) { c.miss++; s.res.miss++ } else s.res.shaky++; s.quiz.push(s.quiz.shift()); s.last = "No problem. It comes back so you can try again." }
    s.last = "Last card: " + (note ? note + " " : "") + s.last; s.combo = r === 3 ? s.combo + 1 : 0; nextStep(); save(); render(); fxAfter(s)
}
document.addEventListener("keydown", function (e) {
    if (tab !== "study" || !sess || !sess.cb || e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT" || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
    var c = sess.cur, h = false;
    if (c && kind(c) === "choice") {
        if (!sess.r && /^[1-9]$/.test(e.key)) { h = true; if (!e.repeat) pickChoice(+e.key - 1) }
        else if (sess.r && e.key === "Enter" && e.target.tagName !== "BUTTON") { h = true; if (!e.repeat) finishChoice(false) }
    } else if (sess.r && /^[123]$/.test(e.key)) { h = true; if (!e.repeat) sess.cb(sess.cur, +e.key) }
    /* the next card puts the cursor in its answer box, so without this the same key press would also be typed there */
    if (h) e.preventDefault()
});
/* screens */
function accSpan(s) {
    if (!accShow()) return ""; var r = s.res, n = r.got + r.shaky + r.miss;
    return '<span class="accy" title="Cards you got right first time">' + (n ? "Accuracy " + Math.round(r.got / n * 100) + '% <small>(' + r.got + " of " + n + ")</small>" : "Accuracy: no answers yet") + '</span>'
}
function flowHeader(s) {
    var steps = [], done, rem = remaining(s), pct;
    if (s.kind === "practice") { done = s.done; steps.push({ n: "Practice" + (s.prac && s.prac.rounds > 1 ? " \u00b7 round " + s.prac.round + " of " + s.prac.rounds : ""), on: true, t: s.done + " of " + (s.done + rem) }) }
    else {
        done = s.revDone + s.grads;
        if (s.revTotal) steps.push({ n: "Review", on: s.phase === "review", ok: s.phase !== "review", t: s.revDone + " of " + s.revTotal });
        if (s.newTotal) steps.push({ n: "Learn new cards", on: s.phase === "teach" || s.phase === "quiz", ok: s.phase === "done", t: s.grads + " of " + s.newTotal })
    }
    pct = done + rem ? Math.round(done / (done + rem) * 100) : 100;
    return '<div class="fl-head"><ol class="fl-steps">' + steps.map(function (x, i) { return '<li class="' + (x.on ? "on" : x.ok ? "ok" : "") + '"' + (x.on ? ' aria-current="step"' : "") + '><b>' + (x.ok ? "\u2713" : i + 1) + '</b> ' + x.n + ' <span>' + x.t + '</span></li>' }).join("") + '</ol><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Session progress"><i style="width:' + pct + '%"></i></div><div class="fl-meta"><span>' + (s.phase === "done" ? "Finished" : rem + (rem === 1 ? " card left" : " cards left") + ' \u00b7 <span title="Estimated from how fast you answer">' + fmtTime(secsLeft(s)) + ' left</span>') + '</span>' + accSpan(s) + (s.combo >= 3 && s.phase !== "done" ? '<span class="combo">\ud83d\udd25 ' + s.combo + ' in a row</span>' : "") + '<button class="linkbtn" id="acctog" type="button">' + (accShow() ? "Hide accuracy" : "Show accuracy") + '</button><button class="sm" id="pz" type="button">' + (s.phase === "done" ? "Back to Today" : "Pause and go back") + '</button></div></div>'
}
function wireHead(v) { var tg = $("#acctog", v); if (tg) tg.onclick = function () { S().showAcc = !accShow(); save(); render() }; var p = $("#pz", v); if (p) p.onclick = function () { if (sess && sess.phase === "done") sess = null; tab = "dash"; render(); cloudFlush() } }
/* short answers: when the expected answer is a word or short phrase, the typed answer is checked for the student (they can still override) */
function sNorm(s) { return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\b(the|a|an)\b/g, " ").replace(/\s+/g, " ").trim() }
function lev(a, b) { var d = [], i, j; for (i = 0; i <= a.length; i++) { d[i] = [i] } for (j = 1; j <= b.length; j++)d[0][j] = j; for (i = 1; i <= a.length; i++)for (j = 1; j <= b.length; j++)d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length] }
function nearly(t, e) { if (!t || !e) return false; if (t === e) return true; var n = Math.max(t.length, e.length); return lev(t, e) <= (n >= 9 ? 2 : n >= 5 ? 1 : 0) }
function expectedAnswers(c) {
    if (kind(c) === "fill-in") return clozePlain(c.q).a.split(", ").filter(Boolean);
    return [String(c.a || "").split("\n")[0].trim()].concat(c.alt || []).filter(Boolean)
}
function isShort(c) { var k = kind(c); if (k === "fill-in") return true; if (k !== "text") return false; var a = String(c.a || ""); return a.length > 0 && a.length <= 60 && a.indexOf("\n") < 0 && a.split(/\s+/).length <= 6 }
function shortMatch(typed, c) {
    var t = sNorm(typed); if (!t) return false; var ex = expectedAnswers(c).map(sNorm).filter(Boolean); if (!ex.length) return false;
    if (kind(c) === "fill-in") return ex.every(function (w) { return t.indexOf(w) > -1 || t.split(" ").some(function (x) { return nearly(x, w) }) });
    return ex.some(function (e) { return nearly(t, e) || (e.length >= 4 && t.indexOf(e) > -1 && t.split(" ").length <= e.split(" ").length + 3) })
}
/* "basically exact": the same words (ignoring capitals, punctuation and a/an/the) or one small typo; looser matches only get a suggestion */
function isExact(typed, c) {
    var t = sNorm(typed); if (!t) return false; var ex = expectedAnswers(c).map(sNorm).filter(Boolean); if (!ex.length) return false;
    if (kind(c) === "fill-in") { if (ex.length === 1) return nearly(t, ex[0]); var tk = t.split(" "); return ex.every(function (w) { return t.indexOf(w) > -1 || tk.some(function (x) { return nearly(x, w) }) }) }
    return ex.some(function (e) { return nearly(t, e) })
}
function autoAdvance(c, typed, cb) {
    fxBurst($("#rv")); sfx("ok"); cb(c, 3, "Correct (\u201c" + typed + "\u201d).")
}
/* "I know this": the card skips the learning stage and starts at level 3, so its first review is days away (sooner when a cram deadline is close) */
function knowCard(c) {
    var now = Date.now(); c.stage = "review"; c.box = 3; c.step = 0; c.u = now; c.due = now + cramIv(c, (GAPS[2] || 3) * DAY);
    var p = (DB.plans || {})[c.deck]; if (p && p.on && p.startLeft > 0) { p.startLeft--; p.u = now }
}
function knowInSession() {
    var s = sess, c = s.phase === "teach" ? s.batch[s.ti] : s.quiz[0]; if (!c) return;
    knowCard(c); s.grads++; s.known = (s.known || 0) + 1; s.lastWin = ""; s.last = "Marked as known. Its first review is " + whenText(c.due) + ".";
    if (s.phase === "teach") s.batch.splice(s.ti, 1); else { s.quiz = s.quiz.filter(function (x) { return x !== c }); nextStep() }
    sfx("ok"); save(); render()
}
function knowBtn() { return sess && (sess.phase === "teach" || sess.phase === "quiz") && sess.kind === "today" ? '<button id="know" type="button" title="Skips the quiz for this card. It comes back for review in a few days.">I already know this</button>' : "" }
function wireKnow(v) { var k = $("#know", v); if (k) k.onclick = knowInSession }
function quizCard(v, c, label, tag, cb) {
    var s = sess; s.cur = c; s.cb = cb; if (!s.r && !s.t0) s.t0 = Date.now();
    var sh = isShort(c), match = s.r && sh && shortMatch(s.mine, c);
    v.innerHTML = flowHeader(s) + '<div class="panel' + (s.r ? "" : " enter") + '"><div class="meta ui"><span>' + label + '</span><span>' + tag + editBtn() + '</span></div>' + (s.last ? '<p class="fl-last' + (s.lastWin && !s.r ? " win" : "") + '" role="status">' + esc(s.last) + '</p>' : "") + media(c) + '<p class="q">' + front(c) + '</p>' +
        (s.r ? '<div class="mine" id="mine"></div><div class="answer">' + back(c) + '</div><p class="hint">How did you do? Be honest: this decides when you see the card again. (keys 1, 2, 3)</p><div class="row rate"><button class="r-miss" data-r="1">1 \u00b7 Missed<small>I didn\'t remember</small></button><button class="r-shaky" data-r="2">2 \u00b7 Shaky<small>Close, or I hesitated</small></button><button class="r-got' + (match ? " sug" : "") + '" data-r="3">3 \u00b7 Got it<small>' + (match ? "Your answer matches" : "I knew it") + '</small></button></div>'
            : '<label for="u">' + (sh ? "Type a word or short phrase, or say it out loud, then check." : "Say it out loud or type what you remember, then check. Guessing counts.") + '</label><textarea id="u" class="' + (sh ? "short" : "") + '" placeholder="' + (sh ? "A word or short phrase" : "Your answer") + '">' + esc(s.draft || "") + '</textarea><div class="row"><button class="primary" id="rv">Show answer</button>' + knowBtn() + '<span class="hint">' + (sh ? "Enter also works" : "Ctrl+Enter also works") + '</span></div>' + (sh ? '<label class="aa"><input type="checkbox" id="aa"' + (S().autoAdv !== false ? " checked" : "") + '> Move on automatically when my answer matches</label>' : "")) + '</div>';
    wireHead(v); wireEdit(v);
    if (!s.r) { var u = $("#u"); u.oninput = function () { s.draft = u.value }; u.onkeydown = function (e) { if (e.key === "Enter" && (sh || e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); $("#rv").click() } }; u.focus(); wireKnow(v); var aa = $("#aa"); if (aa) aa.onchange = function () { S().autoAdv = aa.checked; save() };
        $("#rv").onclick = function () { s.mine = u.value.trim(); s.draft = ""; if (sh && S().autoAdv !== false && isExact(s.mine, c)) { autoAdvance(c, s.mine, cb); return } s.r = 1; render(); if (sh && shortMatch(s.mine, c)) { fxBurst($("#mine")); sfx("ok") } } }
    else { $("#mine").textContent = s.mine ? "You wrote: " + s.mine + (sh ? (match ? "  \u2713 matches" : "  (doesn't match exactly; compare it with the answer)") : "") : "No attempt written."; v.querySelectorAll(".rate button").forEach(function (b) { b.onclick = function () { var r = +b.dataset.r; if (r === 3) { fxBurst(b); sfx("ok") } else if (r === 1) sfx("bad"); cb(c, r) } }) }
}
/* multiple choice: tap an answer and it is graded for the student (correct = got it, wrong = missed, "I guessed" = shaky) */
function pickChoice(k) { var s = sess; if (!s || !s.cur || s.r || !s.order || k < 0 || k >= s.order.length) return; s.pick = s.order[k]; s.tpick = Date.now(); s.r = 1; var tok = s.tok = (s.tok || 0) + 1, c0 = s.cur; render();
    if (s.pick === c0.ci) { fxBurst($(".mc-opt.right")); sfx("ok"); if (S().autoAdvMC) setTimeout(function () { if (sess === s && s.tok === tok && s.r && s.cur === c0) finishChoice(false) }, 1500) } else sfx("bad") }
function finishChoice(guessed) { var s = sess, c = s.cur, ok = s.pick === c.ci; s.cb(c, ok ? (guessed ? 2 : 3) : 1) }
/* the answer box under a multiple-choice question: with per-choice explanations it only needs the one-line takeaway */
function mcAnswer(c) {
    var rest = String(c.a || "").split("\n").slice(1).join("\n").trim();
    if (c.cx && c.cx.some(Boolean)) return rest ? '<div class="answer">' + esc(rest) + '</div>' : "";
    return '<div class="answer">' + back(c) + '</div>'
}
function choiceCard(v, c, label, tag, cb) {
    var s = sess; s.cur = c; s.cb = cb; if (!s.r && !s.t0) s.t0 = Date.now(); if (!s.order) { s.order = shuffle(c.ch.map(function (x, i) { return i })); s.pick = -1 }
    var done = !!s.r, ok = done && s.pick === c.ci;
    v.innerHTML = flowHeader(s) + '<div class="panel' + (s.r ? "" : " enter") + '"><div class="meta ui"><span>' + label + '</span><span>' + tag + editBtn() + '</span></div>' + (s.last ? '<p class="fl-last' + (s.lastWin && !s.r ? " win" : "") + '" role="status">' + esc(s.last) + '</p>' : "") + media(c) + '<p class="q">' + front(c) + '</p>' +
        '<div class="mc" role="group" aria-label="Answer choices">' + s.order.map(function (idx, k) { return '<div class="mc-row"><button type="button" class="mc-opt' + (done ? (idx === c.ci ? " right" : idx === s.pick ? " wrong" : " dim") : "") + '" data-k="' + k + '"' + (done ? " disabled" : "") + '><span class="mc-key">' + (k + 1) + '</span><span class="mc-txt">' + esc(c.ch[idx]) + '</span></button>' + (done && c.cx && c.cx[idx] ? '<p class="mc-why ' + (idx === c.ci ? "right" : idx === s.pick ? "wrong" : "") + '"><b>' + (idx === c.ci ? "Why it\'s correct: " : idx === s.pick ? "Why your answer is wrong: " : "Why this one is wrong: ") + '</b>' + esc(c.cx[idx]) + '</p>' : "") + '</div>' }).join("") + '</div>' +
        (done ? '<p class="fl-last mc-fb ' + (ok ? "ok" : "bad") + '" role="status"><b>' + (ok ? "Correct." : "Not quite.") + '</b></p>' + mcAnswer(c) + '<div class="row"><button class="primary" id="mcn" type="button">Continue</button>' + (ok ? '<button id="mcg" type="button">I guessed (review it sooner)</button>' : "") + '</div>' : '<p class="hint">Pick the best answer (keys 1 to ' + c.ch.length + ').</p><div class="row">' + knowBtn() + '<label class="aa"><input type="checkbox" id="aamc"' + (S().autoAdvMC ? " checked" : "") + '> Move on automatically after a correct answer (skips the explanations)</label></div>') + '</div>';
    wireHead(v); wireEdit(v);
    v.querySelectorAll(".mc-opt").forEach(function (b) { b.onclick = function () { pickChoice(+b.dataset.k) } });
    wireKnow(v); var am = $("#aamc"); if (am) am.onchange = function () { S().autoAdvMC = am.checked; save() };
    if (done) { $("#mcn").onclick = function () { finishChoice(false) }; $("#mcn").focus(); if ($("#mcg")) $("#mcg").onclick = function () { finishChoice(true) } }
}
function pips(n, of) { var h = ""; for (var i = 0; i < of; i++)h += i < n ? "\u25cf" : "\u25cb"; return '<span class="fl-pips" aria-label="' + n + ' of ' + of + ' correct">' + h + '</span> Right ' + n + ' of ' + of }
function teachView(v) {
    var s = sess, c = s.batch[s.ti];
    if (!c) { s.quiz = s.quiz.concat(shuffle(s.batch.filter(alive))); s.batch = []; s.phase = "quiz"; if (s.quiz.length) s.last = "Now a quick quiz on the new cards. Answer from memory."; return studyView(v) }
    var last = s.ti + 1 >= s.batch.length;
    v.innerHTML = flowHeader(s) + '<div class="panel enter"><div class="meta ui"><span>Meet a new card \u00b7 ' + (s.ti + 1) + ' of ' + s.batch.length + '</span><span>' + kind(c) + editBtn() + '</span></div>' + media(c) + '<p class="q">' + front(c) + '</p>' + (kind(c) === "choice" ? '<ul class="mc-list">' + c.ch.map(function (x, i) { return '<li' + (i === c.ci ? ' class="right"' : "") + '>' + esc(x) + (i === c.ci ? " \u2713" : "") + (c.cx && c.cx[i] ? '<span class="mc-why-i">' + esc(c.cx[i]) + '</span>' : "") + '</li>' }).join("") + '</ul>' : "") + '<div class="answer">' + back(c) + '</div><p class="hint">Read it and say the answer out loud. ' + (last ? "That's the last one: a quick quiz on these cards comes next." : "After the last new card you'll get a quick quiz on them.") + '</p><div class="row"><button class="primary" id="nx">' + (last ? "Start the quick quiz" : "Next card") + '</button>' + knowBtn() + '</div></div>';
    wireHead(v); wireEdit(v); wireKnow(v); s.tt0 = Date.now(); $("#nx").focus(); $("#nx").onclick = function () { paceUpdate("teach", (Date.now() - s.tt0) / 1000); save(); s.ti++; s.last = ""; render() }
}
function doneView(v) {
    if (sess.kind === "practice") return practiceDoneView(v);
    var s = sess, r = s.res, st = stats(scoped()), more = inStage("new").length, nx = nextDueTime(), n = r.got + r.shaky + r.miss;
    v.innerHTML = flowHeader(s) + '<div class="panel enter"><h2>' + (s.kind === "practice" ? "Practice complete" : "Nice work. You\'re done for today.") + '</h2><div class="fl-stats"><div><b data-count="' + n + '">' + n + '</b><span>answers</span></div>' + (s.kind === "today" ? '<div><b data-count="' + s.grads + '">' + s.grads + '</b><span>new cards learned</span></div><div><b data-count="' + s.up + '">' + s.up + '</b><span>cards moved up a level</span></div>' + (s.known ? '<div><b data-count="' + s.known + '">' + s.known + '</b><span>marked as known</span></div>' : "") : "") + '</div><p>Remembered ' + r.got + ', shaky ' + r.shaky + ', missed ' + r.miss + '.</p>' +
        '<div class="fl-prog"><div class="meta ui"><span>Deck progress: learned ' + st.learned + ' of ' + st.total + ' cards</span><span>' + st.pct + '%</span></div><div class="bar"><i style="width:' + st.pct + '%"></i></div></div>' +
        '<p class="hint">' + (s.kind === "practice" ? "Practice doesn't change your schedule." : nx ? "Next: your next reviews are due " + whenText(nx) + ". Missed cards come back sooner." : "Come back tomorrow, or add more cards.") + '</p><div class="row"><button class="primary" id="bk">Back to Today</button>' + (s.kind === "today" && more ? '<button data-go="more">Learn ' + Math.min(more, Math.max(1, S().lessonBatch)) + ' more new cards</button>' : "") + '</div></div>';
    wireHead(v); wire(v); $("#bk").onclick = function () { sess = null; tab = "dash"; render(); cloudFlush() }
    fxCount(v); var bi = v.querySelector(".fl-prog .bar i"); if (bi && fxFull()) { var w0 = bi.style.width; bi.style.width = "0%"; setTimeout(function () { bi.style.width = w0 }, 120) }
    if (n > 0) { fxConfetti(); sfx("win") }
}
function studyView(v) {
    if (!DB.cards.length) { v.innerHTML = emptyPanel(); wire(v); return }
    if (!sess) { tab = "dash"; return render() }
    var s = sess; s.rq = s.rq.filter(alive); s.quiz = s.quiz.filter(alive);
    if (s.phase === "review" && !s.rq.length) nextStep();
    if (s.phase === "quiz" && !s.quiz.length) nextStep();
    if (s.phase === "done") return doneView(v);
    if (s.phase === "teach") return teachView(v);
    if (s.phase === "review") { var c = s.rq[0], rt = !!s.again[c.id]; return (kind(c) === "choice" ? choiceCard : quizCard)(v, c, (s.kind === "practice" ? "Practice" : "Review") + (rt ? " \u00b7 second try" : "") + " \u00b7 " + kind(c), s.kind === "practice" ? "" : "Level " + c.box + " of 5", gradeReview) }
    var q = s.quiz[0]; return (kind(q) === "choice" ? choiceCard : quizCard)(v, q, "Quick quiz \u00b7 " + kind(q), pips(q.step, S().learnSteps), gradeLearn)
}
