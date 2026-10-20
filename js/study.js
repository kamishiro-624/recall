/* Study: reviews, lessons (learning stage) and practice. A session stays in memory, so switching tabs resumes it instead of reshuffling. */
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t } return a }
function front(c) { return kind(c) === "fill-in" ? clozeHTML(c.q, false) : (c.q ? esc(c.q) : "What is this?") }
function back(c) { return kind(c) === "fill-in" ? clozeHTML(c.q, true) + (c.a ? "\n" + esc(c.a) : "") : esc(c.a) }
function alive(c) { return DB.cards.indexOf(c) > -1 }
function startReviews() {
    if (sess && sess.mode === "review" && !sess.practice && sess.i < sess.q.length) { tab = "study"; render(); return }
    var l = reviewDue(); if (S().shuffle) l = shuffle(l.slice());
    sess = l.length ? { mode: "review", q: l, i: 0, r: 0, mine: "", res: { miss: 0, shaky: 0, got: 0 } } : null; tab = "study"; render()
}
function startPractice() {
    if (sess && sess.practice && sess.i < sess.q.length) { tab = "study"; render(); return }
    var l = shuffle(scoped().slice()); sess = l.length ? { mode: "review", practice: true, q: l, i: 0, r: 0, mine: "", res: { miss: 0, shaky: 0, got: 0 } } : null; tab = "study"; render()
}
function startLessons() {
    if (sess && sess.mode === "lesson" && sess.phase !== "done") { tab = "study"; render(); return }
    var pool = inStage("new").slice(0, newAllowance()), quiz = inStage("learning");
    if (!pool.length && !quiz.length) { sess = null; tab = "study"; render(); return }
    sess = { mode: "lesson", pool: pool, batch: [], quiz: shuffle(quiz.slice()), phase: "quiz", ti: 0, r: 0, mine: "", res: { miss: 0, shaky: 0, got: 0 }, grads: 0, taught: 0 };
    nextBatch(); tab = "study"; render()
}
function nextBatch() {
    var s = sess;
    if (s.pool.length) { s.batch = s.pool.splice(0, Math.max(1, S().lessonBatch)); s.batch.forEach(function (c) { c.stage = "learning"; c.step = 0; lg().l++ }); s.taught += s.batch.length; s.phase = "teach"; s.ti = 0; save() }
    else s.phase = s.quiz.length ? "quiz" : "done"
}
function gradeReview(c, r) {
    var s = sess;
    if (!s.practice) {
        var L = lg(); L.r++; c.seen++;
        if (r === 3) { c.box = Math.min(5, c.box + 1); L.c++ } else if (r === 1) { c.box = 1; c.miss++ }
        c.due = Date.now() + (r === 1 ? 15 * 60000 : (GAPS[c.box - 1] || 0.25) * DAY)
    }
    s.res[r === 3 ? "got" : r === 2 ? "shaky" : "miss"]++; s.i++; s.r = 0; s.mine = ""; save(); render()
}
function gradeLearn(c, r) {
    var s = sess; lg().q++;
    if (r === 3) { c.step++; s.res.got++; if (c.step >= S().learnSteps) { c.stage = "review"; c.box = 1; c.due = Date.now() + 4 * HOUR; s.grads++; s.quiz.shift() } else s.quiz.push(s.quiz.shift()) }
    else { c.step = 0; if (r === 1) { c.miss++; s.res.miss++ } else s.res.shaky++; s.quiz.push(s.quiz.shift()) }
    s.r = 0; s.mine = ""; if (!s.quiz.length) nextBatch(); save(); render()
}
document.addEventListener("keydown", function (e) { if (tab === "study" && sess && sess.r && sess.cb && /^[123]$/.test(e.key) && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") sess.cb(sess.cur, +e.key) });
function quizCard(v, c, meta, pct, cb) {
    var s = sess; s.cur = c; s.cb = cb;
    v.innerHTML = '<div class="panel"><div class="meta ui"><span>' + meta[0] + '</span><span>' + meta[1] + '</span></div><div class="bar"><i style="width:' + pct + '%"></i></div>' + media(c) + '<p class="q">' + front(c) + '</p>' +
        (s.r ? '<div class="mine" id="mine"></div><div class="answer">' + back(c) + '</div><p class="hint">How close was your answer? (keys 1, 2, 3)</p><div class="row rate"><button class="r-miss" data-r="1">1 · Missed it</button><button class="r-shaky" data-r="2">2 · Shaky</button><button class="r-got" data-r="3">3 · Got it</button></div>'
            : '<label for="u">Say or type what you remember before you look. Guessing counts.</label><textarea id="u" placeholder="Your answer">' + esc(s.draft || "") + '</textarea><div class="row"><button class="primary" id="rv">Show answer</button></div>') + '</div>';
    if (!s.r) { var u = $("#u"); u.oninput = function () { s.draft = u.value }; u.focus(); $("#rv").onclick = function () { s.mine = u.value.trim(); s.draft = ""; s.r = 1; render() } }
    else { $("#mine").textContent = s.mine ? "You wrote: " + s.mine : "No attempt written."; v.querySelectorAll(".rate button").forEach(function (b) { b.onclick = function () { cb(c, +b.dataset.r) } }) }
}
function chooser(v) {
    var rd = reviewDue().length, lc = lessonCount();
    if (!DB.cards.length) { v.innerHTML = emptyPanel(); wire(v); return }
    var sc = scoped(), nx = Math.min.apply(null, inStage("review").map(function (c) { return c.due }).concat([1e18]));
    v.innerHTML = '<div class="panel"><h2>Study</h2><div class="row" style="margin:0"><div style="flex:1;min-width:200px"><div class="big">' + rd + '</div><p class="hint">reviews ready</p><button class="primary" data-go="reviews"' + (rd ? "" : " disabled") + '>Start reviews</button></div><div style="flex:1;min-width:200px"><div class="big">' + lc + '</div><p class="hint">lessons available</p><button class="primary" data-go="lessons"' + (lc ? "" : " disabled") + '>Start lessons</button></div></div>' +
        (!rd && !lc ? '<p>' + (nx < 1e18 ? "All caught up. Your next review is due in about " + (function () { var h = Math.max(1, Math.round((nx - Date.now()) / 36e5)); return h > 47 ? Math.round(h / 24) + " days" : h + " hours" })() + "." : "All caught up for today.") + ' Waiting is part of the method: reviewing just as you start to forget builds the strongest memory.</p>' : "") +
        '<div class="row"><button data-go="practice"' + (sc.length ? "" : " disabled") + '>Practice all cards (doesn\'t change your schedule)</button></div></div>'; wire(v)
}
function summary(v, title, lines) { v.innerHTML = '<div class="panel"><h2>' + title + '</h2>' + lines + '<div class="row"><button class="primary" id="bk">Back to dashboard</button></div></div>'; $("#bk").onclick = function () { sess = null; tab = "dash"; render() } }
function studyView(v) {
    if (!sess) return chooser(v);
    var s = sess;
    if (s.mode === "review") {
        while (s.i < s.q.length && !alive(s.q[s.i])) s.i++;
        if (s.i >= s.q.length) { var r = s.res; return summary(v, s.practice ? "Practice done" : "Reviews done", '<p>' + r.got + ' remembered, ' + r.shaky + ' shaky, ' + r.miss + ' missed.</p><p class="hint">' + (s.practice ? "Practice doesn't change your schedule." : "Missed cards come back soon; cards you know move to longer gaps.") + '</p>') }
        var c = s.q[s.i]; return quizCard(v, c, ["Card " + (s.i + 1) + " of " + s.q.length + " · " + kind(c) + (s.practice ? " · practice" : ""), "Box " + c.box + " of 5"], s.i / s.q.length * 100, gradeReview)
    }
    s.quiz = s.quiz.filter(alive);
    if (s.phase === "teach") {
        var c2 = s.batch[s.ti];
        if (!c2) { s.quiz = s.quiz.concat(shuffle(s.batch.slice())); s.batch = []; s.phase = s.quiz.length ? "quiz" : "done"; return studyView(v) }
        v.innerHTML = '<div class="panel"><div class="meta ui"><span>Lesson ' + (s.ti + 1) + ' of ' + s.batch.length + ' · ' + kind(c2) + '</span><span>' + s.taught + ' new today in this session</span></div><div class="bar"><i style="width:' + (s.ti / s.batch.length * 100) + '%"></i></div>' + media(c2) + '<p class="q">' + front(c2) + '</p><div class="answer">' + back(c2) + '</div><p class="hint">Read it, say it out loud, then continue. You\'ll be quizzed on these next.</p><div class="row"><button class="primary" id="nx">' + (s.ti + 1 >= s.batch.length ? "Start quiz" : "Next") + '</button></div></div>';
        $("#nx").focus(); $("#nx").onclick = function () { s.ti++; render() }; return
    }
    if (s.phase === "done" || !s.quiz.length) { return summary(v, "Lessons done", '<p>' + s.taught + ' new cards learned, ' + s.grads + ' ready for review.</p><p class="hint">Cards you answered correctly ' + S().learnSteps + (S().learnSteps > 1 ? " times" : " time") + ' join your review schedule, with their first review in about 4 hours.</p>') }
    var q = s.quiz[0]; return quizCard(v, q, ["Learning quiz · " + kind(q), "Correct " + q.step + " of " + S().learnSteps], s.grads / (s.grads + s.quiz.length) * 100, gradeLearn)
}
