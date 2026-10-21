/* Dashboard: modular widgets (show/hide and reorder) */
function act(x) { return x.r + x.q + x.l > 0 }
function bar(label, v, max) { var p = max > 0 ? Math.min(100, v / max * 100) : 0; return '<div class="meta ui" style="margin-top:8px"><span>' + label + '</span><span>' + v + (max > 0 ? " / " + max : " · no limit") + '</span></div><div class="bar"><i style="width:' + p + '%"></i></div>' }
var WDEFS = {
  today: {
    t: "Today", w: 2, r: function () {
      var st = stats(scoped()), w = todayWork(), more = inStage("new").length, nx = nextDueTime(), head, sub, btns;
      if (sess && sess.phase === "done") sess = null;
      if (live()) { head = "Session in progress"; sub = remaining(sess) + " left in this session."; btns = '<button class="primary fl-cta" data-go="study">Continue studying</button>' }
      else if (w.rv + w.nl > 0) { head = "Ready when you are"; sub = [w.rv ? w.rv + (w.rv === 1 ? " card to review" : " cards to review") : "", w.nl ? w.nl + " new to learn" : "", "about " + w.min + " min"].filter(Boolean).join(" \u00b7 "); btns = '<button class="primary fl-cta" data-go="study">Start studying</button>' }
      else { head = "You're all caught up"; sub = nx ? "Your next review is due " + whenText(nx) + "." : "Add more cards to keep going."; btns = more ? '<button class="primary fl-cta" data-go="more">Learn ' + Math.min(more, Math.max(1, S().lessonBatch)) + ' more new cards</button>' : "" }
      return '<div class="fl-hero"><div><div class="fl-title">' + head + '</div><p class="fl-sub">' + sub + '</p></div><div class="row" style="margin:0">' + btns + '<button data-go="practice" title="Go through every card without changing your schedule">Practice</button></div></div>' +
        '<div class="fl-prog"><div class="meta ui"><span>Learned ' + st.learned + ' of ' + st.total + ' cards</span><span>' + st.pct + '%</span></div><div class="bar"><i style="width:' + st.pct + '%"></i></div></div>' +
        (st.learned === 0 && !live() ? '<p class="hint" style="margin:10px 0 0">How it works: each day, review the cards that are due, then meet a few new ones and get quizzed on them. Cards you remember come back less often.</p>' : "")
    }
  },
  stages: {
    t: "Your progress", w: 2, r: function () {
      var st = stats(scoped()), n = [st.fresh, st.learning, st.reviewing, st.mastered], tot = st.total || 1;
      var nm = ["New", "Learning", "Reviewing", "Mastered"], col = ["var(--line)", "var(--mid)", "var(--acc)", "var(--ok)"], tip = ["not studied yet", "being taught and quizzed", "coming back on a schedule", "remembered for weeks"];
      return '<div class="stack" role="img" aria-label="Cards by stage">' + n.map(function (x, i) { return x ? '<i style="width:' + (x / tot * 100) + '%;background:' + col[i] + '"></i>' : "" }).join("") + '</div><div class="legend">' + n.map(function (x, i) { return '<span title="' + tip[i] + '"><i style="background:' + col[i] + '"></i>' + nm[i] + ' <b>' + x + '</b></span>' }).join("") + '</div><p class="hint" style="margin:8px 0 0">Cards move to the right as you remember them: New, Learning, Reviewing, Mastered.</p>'
    }
  },
  forecast: {
    t: "Review forecast", w: 2, r: function () {
      var d = [0, 0, 0, 0, 0, 0, 0], st = new Date(); st.setHours(0, 0, 0, 0);
      inStage("review").forEach(function (c) { var i = c.due <= Date.now() ? 0 : Math.floor((c.due - st.getTime()) / DAY); if (i >= 0 && i < 7) d[i]++ });
      var mx = Math.max.apply(null, d.concat([1])), dn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return '<div class="fc">' + d.map(function (x, i) { return '<div><span class="ui">' + x + '</span><i style="height:' + (x / mx * 64 + 4) + 'px"></i><small>' + (i ? dn[new Date(st.getTime() + i * DAY).getDay()] : "Today") + '</small></div>' }).join("") + '</div>'
    }
  },
  streak: {
    t: "Streak", w: 1, r: function () {
      var s = 0, d = new Date(); if (!act(lgp(d))) d.setDate(d.getDate() - 1); while (act(lgp(d)) && s < 1000) { s++; d.setDate(d.getDate() - 1) }
      var r = 0, c = 0; for (var i = 0; i < 7; i++) { var x = lgp(new Date(Date.now() - i * DAY)); r += x.r; c += x.c }
      return '<div class="big">' + s + '</div><p class="hint">day streak</p><p class="hint" style="margin-bottom:0">Review accuracy this week: <b>' + (r ? Math.round(c / r * 100) + "%" : "none yet") + '</b></p>'
    }
  },
  activity: { t: "Activity", w: 2, r: function () { var h = ""; for (var i = 27; i >= 0; i--) { var d = new Date(Date.now() - i * DAY), x = lgp(d), n = x.r + x.q + x.l; h += '<i class="hm l' + (n === 0 ? 0 : n < 10 ? 1 : n < 30 ? 2 : 3) + '" title="' + today(d) + ": " + n + ' answers"></i>' } return '<div class="heat">' + h + '</div><p class="hint" style="margin-bottom:0">Last 28 days, darker means more answers.</p>' } },
  decks: {
    t: "Decks", w: 1, r: function () {
      if (!DB.decks.length) return '<p class="hint">No decks yet.</p>';
      return DB.decks.map(function (d) {
        var cs = DB.cards.filter(function (c) { return c.deck === d.id }), due = cs.filter(function (c) { return c.stage === "review" && c.due <= Date.now() }).length, nw = cs.filter(function (c) { return c.stage !== "review" }).length;
        return '<div class="item" style="padding:6px 0"><div class="body"><div>' + esc(d.name) + '</div><div class="a">' + cs.length + ' cards \u00b7 ' + stats(cs).pct + '% learned \u00b7 ' + due + ' due \u00b7 ' + nw + ' to learn</div></div><button class="sm" data-deck="' + d.id + '"' + (DB.cur === d.id ? ' disabled' : '') + '>' + (DB.cur === d.id ? "Viewing" : "View") + '</button></div>'
      }).join("") + (DB.cur !== "all" ? '<div class="row"><button class="sm" data-deck="all">Show all decks</button></div>' : "")
    }
  },
  trouble: {
    t: "Trouble spots", w: 1, r: function () {
      var l = scoped().filter(function (c) { return c.miss > 0 }).sort(function (a, b) { return b.miss - a.miss }).slice(0, 5);
      return l.length ? l.map(function (c) { return '<div class="item" style="padding:6px 0"><div class="body"><div>' + esc((c.q || "(picture or audio)").replace(/\n/g, " ")) + '</div></div><span class="chip">missed ' + c.miss + '×</span></div>' }).join("") : '<p class="hint">Cards you miss most will show up here.</p>'
    }
  }
};
var WORDER = ["today", "stages", "streak", "forecast", "activity", "decks", "trouble"];
function normWidgets() { var cur = Array.isArray(DB.widgets) ? DB.widgets.filter(function (x) { return WDEFS[x.id] }) : []; WORDER.forEach(function (id) { if (!cur.some(function (x) { return x.id === id })) { if (id === "today") cur.unshift({ id: id, on: true }); else cur.push({ id: id, on: true }) } }); cur.forEach(function (x) { if (x.id === "today") x.on = true }); DB.widgets = cur }
function emptyPanel() { return '<div class="panel"><h2>Welcome to Recall</h2><p>Add some notes to get started. Upload a slide deck or document, paste notes, or build a card by hand. Cards can hold text, fill-in-the-blank, images and audio.</p><div class="row"><button class="primary" data-go="import">Import a file</button><button data-go="add">Create a card</button><button id="sm">Load sample deck</button></div></div>' }
function loadSample() { var d = ensureDeck("Cell biology sample");[["Mitochondria", "Organelles that make most of a cell's ATP"], ["The {{c1::nucleus}} stores a cell's DNA and controls its activity.", ""], ["Osmosis", "Water moving across a membrane toward higher solute concentration"], ["Chloroplasts capture light for {{c1::photosynthesis}}.", ""], ["Enzyme", "A protein that speeds up a chemical reaction without being used up"]].forEach(function (x) { if (!findDup({ q: x[0] }, d)) DB.cards.push(mk({ q: x[0], a: x[1] }, d)) }); DB.cur = "all"; save(); render() }
function go(g) { if (g === "study") startStudy(); else if (g === "more") startStudy(true); else if (g === "practice") startPractice(); else { tab = g; render() } }
function wire(v) { v.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { go(b.dataset.go) } }); if ($("#sm", v)) $("#sm", v).onclick = loadSample }
function dashView(v) {
  if (!DB.cards.length) { v.innerHTML = emptyPanel(); wire(v); return }
  var ws = DB.widgets;
  v.innerHTML = '<div class="row" style="margin:0 0 12px;justify-content:space-between"><h2 style="margin:0">' + (DB.cur === "all" ? "All decks" : esc(deckName(DB.cur))) + '</h2></div>' + (editDash ? '<p class="hint">Show or hide sections and move them up or down.</p>' : "") +
    '<div class="grid">' + ws.map(function (w, i) {
      var d = WDEFS[w.id]; if (!w.on && !editDash) return "";
      return '<section class="w' + (d.w === 2 ? " w2" : "") + (w.on ? "" : " off") + '" aria-label="' + d.t + '"><div class="wh"><h3>' + d.t + '</h3>' + (editDash ? '<span class="wc">' + (w.id === "today" ? "" : '<label class="inl"><input type="checkbox" data-vis="' + i + '"' + (w.on ? " checked" : "") + '> Show</label>') + '<button class="sm" data-mv="' + i + '" data-dir="-1" aria-label="Move ' + d.t + ' earlier">\u2191</button><button class="sm" data-mv="' + i + '" data-dir="1" aria-label="Move ' + d.t + ' later">\u2193</button></span>' : "") + '</div>' + (w.on ? d.r() : '<p class="hint">Hidden</p>') + '</section>'
    }).join("") + '</div><div class="row fl-foot"><button class="sm" id="cz">' + (editDash ? "Done customizing" : "Customize this page") + '</button></div>';
  wire(v);
  $("#cz").onclick = function () { editDash = !editDash; render() };
  v.querySelectorAll("[data-vis]").forEach(function (c) { c.onchange = function () { DB.widgets[+c.dataset.vis].on = c.checked; save(); render() } });
  v.querySelectorAll("[data-mv]").forEach(function (b) { b.onclick = function () { var i = +b.dataset.mv, j = i + +b.dataset.dir; if (j < 0 || j >= DB.widgets.length) return; var t = DB.widgets[i]; DB.widgets[i] = DB.widgets[j]; DB.widgets[j] = t; save(); render() } });
  v.querySelectorAll("[data-deck]").forEach(function (b) { b.onclick = function () { DB.cur = b.dataset.deck; sess = null; save(); render() } })
}
