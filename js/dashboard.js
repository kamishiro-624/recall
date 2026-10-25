/* Home screen: sections that can be resized, reordered (drag or arrows), hidden and configured. Rows always fill the width, so the layout never has gaps. */
function act(x) { return x.r + x.q + x.l > 0 }
function bar(label, v, max) { var p = max > 0 ? Math.min(100, v / max * 100) : 0; return '<div class="meta ui" style="margin-top:8px"><span>' + label + '</span><span>' + v + (max > 0 ? " / " + max : " · no limit") + '</span></div><div class="bar"><i style="width:' + p + '%"></i></div>' }
var SIZES = { s: "Small", m: "Medium", l: "Large", f: "Full" };
var dragFrom = -1;
var WDEFS = {
  today: {
    t: "Today", size: "f", r: function (w) {
      var st = stats(scoped()), w = todayWork(), more = inStage("new").length, nx = nextDueTime(), head, sub, btns;
      if (sess && sess.phase === "done") sess = null;
      if (live()) { var pr = sess.kind === "practice"; head = pr ? "Practice in progress" : "Session in progress"; sub = remaining(sess) + " left, " + fmtTime(secsLeft(sess)) + "."; btns = '<button class="primary fl-cta" data-go="study">' + (pr ? "Continue practice" : "Continue studying") + '</button>' + (pr ? '<button data-go="endprac" type="button">End practice</button>' : "") }
      else if (w.rv + w.nl > 0) { head = "Ready when you are"; sub = [w.rv ? w.rv + (w.rv === 1 ? " card to review" : " cards to review") : "", w.nl ? w.nl + " new to learn" : "", fmtTime(w.secs)].filter(Boolean).join(" \u00b7 "); btns = '<button class="primary fl-cta" data-go="study">Start studying</button>' }
      else { head = "You're all caught up"; sub = nx ? "Your next review is due " + whenText(nx) + "." : "Add more cards to keep going."; btns = more ? '<button class="primary fl-cta" data-go="more">Learn ' + Math.min(more, Math.max(1, S().lessonBatch)) + ' more new cards</button>' : "" }
      return '<div class="fl-hero"><div><div class="fl-title">' + head + '</div><p class="fl-sub">' + sub + '</p></div><div class="row" style="margin:0">' + btns + '<button data-go="practice" title="Go through every card without changing your schedule">Practice</button><button data-go="cram" title="Plan your study around a deadline">Deadline plan</button></div></div>' +
        '<div class="fl-prog"><div class="meta ui"><span>Learned ' + st.learned + ' of ' + st.total + ' cards</span><span>' + st.pct + '%</span></div><div class="bar"><i style="width:' + st.pct + '%"></i></div></div>' +
        (!ACCT.user && !S().acctDismiss ? '<p class="hint fl-note">Your cards are saved on this device only. <button class="sm" data-go="acct" type="button">Sign in to save them online</button> <button class="sm" data-go="acctno" type="button">Not now</button></p>' : "") + (st.learned === 0 && !live() ? '<p class="hint" style="margin:10px 0 0">How it works: each day, review the cards that are due, then meet a few new ones and get quizzed on them. Cards you remember come back less often.</p>' : "")
    }
  },
  stages: {
    t: "Your progress", size: "l", r: function (w) {
      var st = stats(scoped()), n = [st.fresh, st.learning, st.reviewing, st.mastered], tot = st.total || 1;
      var nm = ["New", "Learning", "Reviewing", "Mastered"], col = ["var(--line)", "var(--mid)", "var(--acc)", "var(--ok)"], tip = ["not studied yet", "being taught and quizzed", "coming back on a schedule", "remembered for weeks"];
      return '<div class="stack" role="img" aria-label="Cards by stage">' + n.map(function (x, i) { return x ? '<i style="width:' + (x / tot * 100) + '%;background:' + col[i] + '"></i>' : "" }).join("") + '</div><div class="legend">' + n.map(function (x, i) { return '<span title="' + tip[i] + '"><i style="background:' + col[i] + '"></i>' + nm[i] + ' <b>' + x + '</b></span>' }).join("") + '</div><p class="hint" style="margin:8px 0 0">Cards move to the right as you remember them: New, Learning, Reviewing, Mastered.</p>'
    }
  },
  streak: {
    t: "Streak", size: "s", r: function (w) {
      var s = 0, d = new Date(); if (!act(lgp(d))) d.setDate(d.getDate() - 1); while (act(lgp(d)) && s < 1000) { s++; d.setDate(d.getDate() - 1) }
      var r = 0, c = 0; for (var i = 0; i < 7; i++) { var x = lgp(new Date(Date.now() - i * DAY)); r += x.r; c += x.c }
      return '<div class="big">' + s + '</div><p class="hint">day streak</p><p class="hint" style="margin-bottom:0">Review accuracy this week: <b>' + (r ? Math.round(c / r * 100) + "%" : "none yet") + '</b></p>'
    }
  },
  goal: {
    t: "Daily goal", size: "s", off: true, r: function (w) { var L = lgp(); return bar("New cards learned", L.l, S().newPerDay) + bar("Reviews done", L.r, S().maxReviews) + '<p class="hint" style="margin-bottom:0">Change limits in Settings.</p>' }
  },
  forecast: {
    t: "Review forecast", size: "m", o: [{ k: "days", label: "Days shown", d: 7, v: [[7, "7 days"], [14, "14 days"], [30, "30 days"]] }], r: function (w) {
      var n = +(w.opt.days || 7), d = [], st = new Date(); st.setHours(0, 0, 0, 0); for (var k = 0; k < n; k++)d.push(0);
      inStage("review").forEach(function (c) { var i = c.due <= Date.now() ? 0 : Math.floor((c.due - st.getTime()) / DAY); if (i >= 0 && i < n) d[i]++ });
      var mx = Math.max.apply(null, d.concat([1])), dn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], step = n > 14 ? 5 : n > 7 ? 2 : 1;
      return '<div class="fc">' + d.map(function (x, i) { var dt = new Date(st.getTime() + i * DAY); return '<div><span class="ui">' + (n > 14 && !x ? "" : x) + '</span><i style="height:' + (x / mx * 64 + 4) + 'px"></i><small>' + (i % step ? "" : i ? (n > 7 ? dt.getDate() : dn[dt.getDay()]) : "Today") + '</small></div>' }).join("") + '</div>'
    }
  },
  activity: {
    t: "Activity", size: "m", o: [{ k: "weeks", label: "Time span", d: 4, v: [[4, "4 weeks"], [8, "8 weeks"], [12, "12 weeks"]] }], r: function (w) {
      var wk = +(w.opt.weeks || 4), h = ""; for (var i = wk * 7 - 1; i >= 0; i--) { var d = new Date(Date.now() - i * DAY), x = lgp(d), n = x.r + x.q + x.l; h += '<i class="hm l' + (n === 0 ? 0 : n < 10 ? 1 : n < 30 ? 2 : 3) + '" title="' + today(d) + ": " + n + ' answers"></i>' }
      return '<div class="heat">' + h + '</div><p class="hint" style="margin-bottom:0">Last ' + wk + ' weeks, darker means more answers.</p>'
    }
  },
  decks: {
    t: "Decks", size: "m", r: function (w) {
      if (!DB.decks.length) return '<p class="hint">No decks yet.</p>';
      return DB.decks.map(function (d) {
        var cs = DB.cards.filter(function (c) { return c.deck === d.id });
        return '<div class="item" style="padding:6px 0"><div class="body"><div>' + esc(d.name) + '</div><div class="a">' + cs.length + ' cards \u00b7 ' + stats(cs).pct + '% learned</div></div><button class="sm" data-deck="' + d.id + '"' + (DB.cur === d.id ? ' disabled' : '') + '>' + (DB.cur === d.id ? "Viewing" : "View") + '</button></div>'
      }).join("") + (DB.cur !== "all" ? '<div class="row"><button class="sm" data-deck="all">Show all decks</button></div>' : "")
    }
  },
  trouble: {
    t: "Trouble spots", size: "m", o: [{ k: "n", label: "Cards shown", d: 5, v: [[5, "5"], [10, "10"]] }], r: function (w) {
      var l = scoped().filter(function (c) { return c.miss > 0 }).sort(function (a, b) { return b.miss - a.miss }).slice(0, +(w.opt.n || 5));
      return l.length ? l.map(function (c) { return '<div class="item" style="padding:6px 0"><div class="body"><div>' + esc((c.q || "(picture or audio)").replace(/\n/g, " ")) + '</div></div><span class="chip">missed ' + c.miss + '\u00d7</span></div>' }).join("") : '<p class="hint">Cards you miss most will show up here.</p>'
    }
  },
  plan: {
    t: "Deadlines", size: "m", r: function (w) {
      var ps = activePlans().filter(function (x) { return x.p.due > Date.now() });
      if (!ps.length) return '<p class="hint" style="margin-top:0">Studying for a test? Pick a deck and a deadline and Recall plans the days for you.</p><button data-go="cram" type="button">Set up a deadline plan</button>';
      var lab = { done: "all learned", behind: "behind", ahead: "ahead", ok: "on track" };
      return ps.slice(0, 4).map(function (x) { var a = cramAnalyze(x.id, x.p); return '<div class="item" style="padding:6px 0"><div class="body"><div>' + esc(deckName(x.id)) + '</div><div class="a">' + dueText(x.p.due) + ' \u00b7 ' + cramQuotaLeft(x.id) + ' new cards today \u00b7 ' + a.st.left + ' left to learn</div></div><span class="chip' + (a.status === "behind" ? " warn" : "") + '">' + lab[a.status] + '</span></div>' }).join("") + '<div class="row"><button class="sm" data-go="cram" type="button">Open plans</button></div>'
    }
  },
  note: {
    t: "My note", size: "m", off: true, r: function (w) {
      var t = (w.opt.text || "").trim(), i = DB.widgets.indexOf(w);
      return editDash ? '<textarea class="wnote" data-note="' + i + '" maxlength="600" placeholder="A reminder or goal, for example: Quiz on Friday, finish 20 cards a day">' + esc(w.opt.text || "") + '</textarea>' : (t ? '<p class="wnote-t">' + esc(t) + '</p>' : '<p class="hint">Add a reminder or goal in Customize mode.</p>')
    }
  }
};
var WORDER = ["today", "stages", "streak", "plan", "forecast", "activity", "decks", "trouble", "goal", "note"];
var PRESETS = {
  balanced: { label: "Balanced (the default)", list: [["today", "f"], ["stages", "l"], ["streak", "s"], ["plan", "m"], ["forecast", "m"], ["activity", "m"], ["decks", "m"], ["trouble", "m"]] },
  focus: { label: "Focus: today and progress", list: [["today", "f"], ["stages", "l"], ["goal", "s"]] },
  everything: { label: "Everything", list: [["today", "f"], ["stages", "l"], ["goal", "s"], ["streak", "s"], ["plan", "m"], ["forecast", "m"], ["activity", "m"], ["decks", "m"], ["trouble", "m"], ["note", "f"]] },
  minimal: { label: "Minimal: just today", list: [["today", "f"]] }
};
function wDefault(id) { var d = WDEFS[id]; return { id: id, on: !d.off, size: d.size, opt: {} } }
function normWidgets() {
  var cur = Array.isArray(DB.widgets) ? DB.widgets.filter(function (x) { return WDEFS[x.id] }) : [];
  cur.forEach(function (x) { if (!SIZES[x.size]) x.size = WDEFS[x.id].size; x.opt = x.opt || {}; if (x.id === "today") x.on = true });
  WORDER.forEach(function (id) { if (!cur.some(function (x) { return x.id === id })) { var e = wDefault(id); if (id === "today") cur.unshift(e); else cur.push(e) } });
  DB.widgets = cur
}
function applyPreset(name) {
  var p = PRESETS[name]; if (!p) return; var old = {}, out = [], used = {}; (DB.widgets || []).forEach(function (w) { old[w.id] = w });
  p.list.forEach(function (x) { var e = wDefault(x[0]); e.on = true; e.size = x[1]; if (old[x[0]]) e.opt = old[x[0]].opt || {}; out.push(e); used[x[0]] = 1 });
  WORDER.forEach(function (id) { if (!used[id]) { var e = wDefault(id); e.on = false; if (old[id]) e.opt = old[id].opt || {}; out.push(e) } });
  DB.widgets = out
}
function moveWidget(i, dir) { var ws = DB.widgets, j = i + dir; while (j >= 0 && j < ws.length && !ws[j].on) j += dir; if (j < 0 || j >= ws.length) return; var t = ws[i]; ws[i] = ws[j]; ws[j] = t }
function editControls(w, i) {
  var d = WDEFS[w.id];
  return '<div class="wedit"><div class="wsz" role="group" aria-label="Size of ' + d.t + '">' + Object.keys(SIZES).map(function (k) { return '<button type="button" class="sm' + (w.size === k ? " on" : "") + '" data-sz="' + i + ':' + k + '" aria-pressed="' + (w.size === k) + '">' + SIZES[k] + '</button>' }).join("") + '</div>' +
    (d.o || []).map(function (o) { return '<label class="inl wopt">' + o.label + ' <select data-opt="' + i + ':' + o.k + '">' + o.v.map(function (x) { return '<option value="' + x[0] + '"' + (String(w.opt[o.k] != null ? w.opt[o.k] : o.d) === String(x[0]) ? " selected" : "") + '>' + x[1] + '</option>' }).join("") + '</select></label>' }).join("") +
    '<span class="wmv"><button class="sm" type="button" data-mv="' + i + ':-1" aria-label="Move ' + d.t + ' earlier">\u2190</button><button class="sm" type="button" data-mv="' + i + ':1" aria-label="Move ' + d.t + ' later">\u2192</button>' + (w.id === "today" ? "" : '<button class="sm" type="button" data-hide="' + i + '">Hide</button>') + '</span></div>'
}
function secHTML(w, i) {
  var d = WDEFS[w.id];
  return '<section class="dw sz-' + w.size + (editDash ? " editing" : "") + '" data-wi="' + i + '" data-id="' + w.id + '" aria-label="' + d.t + '"><div class="wh"><h3>' + d.t + '</h3>' + (editDash ? '<span class="grip" draggable="true" data-grip="' + i + '" title="Drag to move this section" aria-hidden="true">\u2847\u2847</span>' : "") + '</div>' + (editDash ? editControls(w, i) : "") + d.r(w) + '</section>'
}
function emptyPanel() { return '<div class="panel"><h2>Welcome to Recall</h2><p>Add some notes to get started. Upload a slide deck or document, paste notes, or build a card by hand. Cards can hold text, fill-in-the-blank, images and audio.</p><div class="row"><button class="primary" data-go="import">Import a file</button><button data-go="add">Create a card</button><button id="sm">Load sample deck</button></div></div>' }
function loadSample() { var d = ensureDeck("Cell biology sample");[["Mitochondria", "Organelles that make most of a cell's ATP"], ["The {{c1::nucleus}} stores a cell's DNA and controls its activity.", ""], ["Osmosis", "Water moving across a membrane toward higher solute concentration"], ["Chloroplasts capture light for {{c1::photosynthesis}}.", ""], ["Enzyme", "A protein that speeds up a chemical reaction without being used up"]].forEach(function (x) { if (!findDup({ q: x[0] }, d)) DB.cards.push(mk({ q: x[0], a: x[1] }, d)) }); DB.cur = "all"; save(); render() }
function go(g) { if (g === "study") startStudy(); else if (g === "more") startStudy(true); else if (g === "practice") { tab = "practice"; render() } else if (g === "pracnext") startRound(); else if (g === "endprac") { sess = null; render() } else if (g === "acct") openAccount(); else if (g === "acctno") { S().acctDismiss = true; save(); render() } else { tab = g; render() } }
function wire(v) { v.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { go(b.dataset.go) } }); if ($("#sm", v)) $("#sm", v).onclick = loadSample }
function dashView(v) {
  if (!DB.cards.length) { v.innerHTML = emptyPanel(); wire(v); return }
  var ws = DB.widgets, hid = [];
  ws.forEach(function (w, i) { if (!w.on) hid.push(i) });
  v.innerHTML = '<div class="dash-title"><h2>' + (DB.cur === "all" ? "All decks" : esc(deckName(DB.cur))) + '</h2>' + (editDash ? "" : '<button class="sm" id="cz" type="button">Customize</button>') + '</div>' +
    (editDash ? '<div class="panel editbar"><div><b>Customize your home screen</b><p class="hint" style="margin:2px 0 0">Drag the \u2847 handle (or use the arrows) to move sections, choose a size, and hide what you don\'t need. Rows fill the width on their own, so nothing leaves a gap.</p></div><div class="row"><label for="dpre" class="inl">Layout</label><select id="dpre"><option value="">Start from a ready-made layout\u2026</option>' + Object.keys(PRESETS).map(function (k) { return '<option value="' + k + '">' + PRESETS[k].label + '</option>' }).join("") + '</select><button class="primary" id="cz" type="button">Done</button></div></div>' : "") +
    '<div class="dash' + (editDash ? " editing" : "") + '">' + ws.map(function (w, i) { return w.on ? secHTML(w, i) : "" }).join("") + '</div>' +
    (editDash && hid.length ? '<div class="panel tray"><h3>Hidden sections</h3><p class="hint" style="margin:0 0 8px">Click to add a section back.</p><div class="row" style="margin:0">' + hid.map(function (i) { return '<button type="button" data-show="' + i + '">+ ' + WDEFS[ws[i].id].t + '</button>' }).join("") + '</div></div>' : "");
  wire(v);
  $("#cz").onclick = function () { editDash = !editDash; render() };
  v.querySelectorAll("[data-deck]").forEach(function (b) { b.onclick = function () { DB.cur = b.dataset.deck; sess = null; save(); render() } });
  if (!editDash) return;
  var pre = $("#dpre"); pre.onchange = async function () { var k = this.value; this.value = ""; if (!k) return; if (await askConfirm({ title: "Use the \u201c" + PRESETS[k].label + "\u201d layout?", body: "This replaces your current arrangement and sizes. Your note and section settings are kept.", ok: "Use this layout" })) { applyPreset(k); save(); render() } };
  v.querySelectorAll("[data-sz]").forEach(function (b) { b.onclick = function () { var p = b.dataset.sz.split(":"); DB.widgets[+p[0]].size = p[1]; save(); render() } });
  v.querySelectorAll("[data-opt]").forEach(function (s) { s.onchange = function () { var p = s.dataset.opt.split(":"); DB.widgets[+p[0]].opt[p[1]] = isNaN(+s.value) ? s.value : +s.value; save(); render() } });
  v.querySelectorAll("[data-mv]").forEach(function (b) { b.onclick = function () { var p = b.dataset.mv.split(":"); moveWidget(+p[0], +p[1]); save(); render() } });
  v.querySelectorAll("[data-hide]").forEach(function (b) { b.onclick = function () { DB.widgets[+b.dataset.hide].on = false; save(); render() } });
  v.querySelectorAll("[data-show]").forEach(function (b) { b.onclick = function () { DB.widgets[+b.dataset.show].on = true; save(); render() } });
  v.querySelectorAll("[data-note]").forEach(function (t) { t.oninput = function () { DB.widgets[+t.dataset.note].opt.text = t.value; save() } });
  v.querySelectorAll("[data-grip]").forEach(function (g) {
    g.ondragstart = function (e) { dragFrom = +g.dataset.grip; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(dragFrom)); var sec = g.closest(".dw"); if (sec) { try { e.dataTransfer.setDragImage(sec, 24, 18) } catch (x) { } sec.classList.add("dragging") } };
    g.ondragend = function () { dragFrom = -1; v.querySelectorAll(".dw").forEach(function (s) { s.classList.remove("dragging", "dropt") }) }
  });
  v.querySelectorAll(".dw").forEach(function (s) {
    s.ondragover = function (e) { if (dragFrom < 0) return; e.preventDefault(); s.classList.add("dropt") };
    s.ondragleave = function () { s.classList.remove("dropt") };
    s.ondrop = function (e) { if (dragFrom < 0) return; e.preventDefault(); var to = +s.dataset.wi; if (to !== dragFrom) { var it = DB.widgets.splice(dragFrom, 1)[0]; DB.widgets.splice(to, 0, it); save() } dragFrom = -1; render() }
  })
}
