/* Add cards from files or notes, in three clear steps:
   1. Add your material (files or pasted notes), with proof of what was read
   2. Choose ONE way to make cards: AI-written questions, or automatic cards
   3. Review (search and filter), then add */
var FILE_ID = 0;
function iFiles() { return imp.files || (imp.files = []) }
function iopts() { return imp.o || (imp.o = { key: true, terms: true, cloze: true, img: true }) }
function useAI() { return (imp.method || "ai") === "ai" }
function recompute() {
  imp.direct = []; imp.secs = [];
  iFiles().forEach(function (f) { if (f.state === "ok") { imp.direct = imp.direct.concat(f.direct || []); imp.secs = imp.secs.concat(f.secs || []) } })
}
function wrapCard(c) { return { c: c, on: true } }
function rebuild() {
  imp.items = imp.direct.map(wrapCard).concat(useAI() ? aiBlendCards(imp.ai || []).map(wrapCard) : aiBlendCards(gen(imp.secs, iopts())).map(wrapCard)); markDups(false)
}
function markDups(keepTouched) {
  var seen = {}, all = S().dupScope === "all", def = deckId(imp.deck || "My deck");
  imp.items.forEach(function (x) {
    var did = x.c.deck ? deckId(x.c.deck) : def, k = (all ? "" : did) + "#" + dkey(x.c), db = findDup(x.c, did);
    x.dup = db ? "deck" : seen[k] ? "batch" : ""; seen[k] = 1; if (!(keepTouched && x.touched)) x.on = !x.dup
  })
}
function sizeText(f) {
  if (f.pasted) return f.size + " words";
  return f.size < 1024 ? f.size + " B" : f.size < 1048576 ? Math.round(f.size / 1024) + " KB" : (f.size / 1048576).toFixed(1) + " MB"
}
function describe(f, ext) {
  var parts = [];
  if (f.secs.length) {
    var unit = ext === "pptx" ? (f.secs.length === 1 ? "slide" : "slides") : (f.secs.length === 1 ? "section" : "sections"), notes = f.secs.filter(function (s) { return s.notes }).length, pics = f.secs.reduce(function (a, s) { return a + s.imgs.length }, 0);
    parts.push(f.secs.length + " " + unit + " read"); if (notes) parts.push(notes + " with speaker notes"); if (pics) parts.push(pics + (pics === 1 ? " picture" : " pictures"))
  }
  if (f.direct.length) parts.push(f.direct.length + (f.direct.length === 1 ? " ready-made card" : " ready-made cards") + " found");
  return parts.join(" \u00b7 ")
}
async function ingest(list) {
  list = Array.prototype.slice.call(list);
  for (var k = 0; k < list.length; k++) {
    var f = list[k], ext = f.name.split(".").pop().toLowerCase(), base = f.name.replace(/\.[^.]+$/, "");
    if (iFiles().some(function (x) { return x.name === f.name && x.size === f.size })) { imp.msg = f.name + " is already loaded."; continue }
    imp.msg = "";
    var e = { id: ++FILE_ID, name: f.name, size: f.size, state: "reading", note: "", pct: null, label: "Opening " + f.name + "\u2026", direct: [], secs: [] }; iFiles().push(e); if (!imp.deck) imp.deck = base;
    importView($("#view"));
    var pid = "fp" + e.id;
    try {
      if (ext === "pptx") { if (typeof JSZip === "undefined") throw new Error("jszip"); e.secs = await readPptx(await f.arrayBuffer(), base, function (n, t) { e.pct = t ? n / t * 100 : 0; e.label = n ? "Reading slide " + n + " of " + t + "\u2026" : "Found " + t + " slides\u2026"; progSet(pid, e.pct, e.label) }) }
      else if (ext === "docx") { if (typeof JSZip === "undefined") throw new Error("jszip"); e.label = "Reading the document\u2026"; progSet(pid, null, e.label); e.secs = await readDocx(await f.arrayBuffer(), base) }
      else if (ext === "json") e.direct = fromJSON(await f.text()).direct;
      else if (ext === "csv" || ext === "tsv") e.direct = fromDelim(await f.text());
      else if (ext === "ppt" || ext === "doc" || ext === "pdf") { e.state = "err"; e.note = "Old .ppt/.doc files and PDFs can't be read in the browser. Save as .pptx or .docx, or paste the text." }
      else { var r = fromText(await f.text(), base); e.direct = r.direct; e.secs = r.secs }
      if (e.state === "reading") { e.note = describe(e, ext); if (e.note) e.state = "ok"; else { e.state = "warn"; e.note = "Nothing usable was found. Try a deck with text on the slides, or paste notes." } }
    } catch (err) { e.state = "err"; e.note = err && err.message === "jszip" ? "The file reader didn't load. Check your internet connection and reload the page." : "Couldn't read this file. It may be damaged or password protected." }
    e.secs.forEach(function (s) { s.file = e.name }); recompute(); rebuild();
  }
  importView($("#view"))
}
function addPasted(text) {
  var r = fromText(text, "Pasted notes"), words = text.trim().split(/\s+/).length;
  var e = { id: ++FILE_ID, name: "Pasted notes", size: words, pasted: true, state: "ok", note: "", direct: r.direct, secs: r.secs };
  e.note = describe(e, "txt"); if (!e.note) { e.state = "warn"; e.note = "Nothing usable was found. Use \"term :: definition\" lines, tab-separated lines, or headings with bullets." }
  iFiles().push(e); if (!imp.deck) imp.deck = "Pasted notes"; imp.paste = ""; recompute(); rebuild(); importView($("#view"))
}
function fileHTML(f) {
  var icon = f.state === "ok" ? "\u2713" : f.state === "err" ? "!" : f.state === "warn" ? "?" : "\u2026", more = "";
  if (f.state === "ok" && f.secs.length) more = '<details class="file-more"><summary>Show what was read</summary><ol>' + f.secs.slice(0, 80).map(function (s) { return "<li>" + esc(s.title) + "</li>" }).join("") + (f.secs.length > 80 ? "<li>\u2026and " + (f.secs.length - 80) + " more</li>" : "") + "</ol></details>";
  return '<li class="file ' + f.state + '"><span class="file-ic" aria-hidden="true">' + icon + '</span><div class="file-body"><div class="file-name">' + esc(f.name) + ' <span class="chip">' + sizeText(f) + '</span></div>' +
    (f.state === "reading" ? progHTML("fp" + f.id, f.label) : '<div class="file-note" role="status">' + (f.state === "ok" ? "Loaded: " : "") + esc(f.note) + '</div>') + more + '</div>' + (f.state === "reading" ? "" : '<button class="sm" type="button" data-rm="' + f.id + '" aria-label="Remove ' + esc(f.name) + '">Remove</button>') + '</li>'
}
function importView(v) {
  if (imp.ai && imp.ai.length) imp.aiCov = aiCoverage(aiSources(), imp.ai);
  var files = iFiles(), hasSecs = imp.secs.length > 0, hasDirect = imp.direct.length > 0, o = iopts(), ai = useAI();
  var ok = files.filter(function (f) { return f.state === "ok" }).length;
  v.innerHTML = addSeg("import") +
    '<div class="panel"><h2>1. Add your material</h2><p class="hint">Slide decks (.pptx) and documents (.docx) are read for their text, notes and pictures. Also reads .txt, .md, .csv, .tsv and .json, including Anki and Quizlet exports.</p>' +
    '<div class="drop" id="drop"><input type="file" id="ff" multiple accept=".pptx,.docx,.txt,.md,.csv,.tsv,.json" aria-label="Choose files"><p>Choose files or drop them here</p></div>' +
    '<p class="hint fl-err" id="imsg" role="status">' + esc(imp.msg || "") + '</p>' +
    (files.length ? '<h3>Loaded files</h3><ul class="files">' + files.map(fileHTML).join("") + '</ul>' + (ok ? '<p class="hint"><b>Ready:</b> ' + (hasSecs ? imp.secs.length + " slides or sections" : "") + (hasSecs && hasDirect ? " and " : "") + (hasDirect ? imp.direct.length + " ready-made cards" : "") + '.</p>' : "") : "") +
    '<label for="pt">Or paste notes (term :: definition, tab-separated, or headings with bullets)</label><textarea id="pt">' + esc(imp.paste || "") + '</textarea><div class="row"><button id="pb" type="button">Read pasted notes</button></div></div>' +
    (hasSecs ? '<div class="panel"><h2>2. Choose how to make cards</h2><p class="hint">Pick one. You can switch at any time and nothing is lost.</p>' +
      '<div class="choice" role="radiogroup" aria-label="How to make cards"><button type="button" role="radio" aria-checked="' + ai + '" class="' + (ai ? "on" : "") + '" data-m="ai"><b>AI-written questions</b><span>Tests understanding: why, how, compare, predict. Takes about a minute and needs an AI provider.</span></button>' +
      '<button type="button" role="radio" aria-checked="' + !ai + '" class="' + (ai ? "" : "on") + '" data-m="auto"><b>Automatic cards</b><span>Instant, no setup. Turns slide text into key-point, term and fill-in cards, so it mostly tests memory of the slides.</span></button></div>' +
      (ai ? aiControls() : '<div class="opts"><label><input type="checkbox" id="o1"' + (o.key ? " checked" : "") + '> Key-points card for each slide or section</label><label><input type="checkbox" id="o2"' + (o.terms ? " checked" : "") + '> Term cards from lines like "Term: definition"</label><label><input type="checkbox" id="o3"' + (o.cloze ? " checked" : "") + '> Fill-in-the-blank cards from longer sentences</label><label><input type="checkbox" id="o4"' + (o.img ? " checked" : "") + '> Image cards from slide pictures</label></div><p class="hint" id="ocount" role="status"></p>') + '</div>'
      : (hasDirect ? '<div class="panel"><h2>2. Choose how to make cards</h2><p class="hint">These files already contain finished cards, so there is nothing to generate. Review them below.</p></div>' : "")) +
    '<div id="istep3"></div>';
  var ff = $("#ff"); ff.onchange = function () { var l = Array.prototype.slice.call(ff.files); ff.value = ""; ingest(l) }; var dr = $("#drop");
  dr.ondragover = function (e) { e.preventDefault(); dr.classList.add("over") }; dr.ondragleave = function () { dr.classList.remove("over") }; dr.ondrop = function (e) { e.preventDefault(); dr.classList.remove("over"); ingest(e.dataTransfer.files) };
  $("#pt").oninput = function () { imp.paste = this.value };
  $("#pb").onclick = function () { var t = $("#pt").value; if (!t.trim()) { $("#imsg").textContent = "Paste some notes first."; return } addPasted(t) };
  v.querySelectorAll("[data-rm]").forEach(function (b) { b.onclick = function () { var id = +b.dataset.rm; imp.files = iFiles().filter(function (f) { return f.id !== id }); recompute(); if (imp.ai && imp.ai.length) { imp.ai = []; imp.aiMsg = "The material changed, so the earlier AI questions were cleared. Write a new set." } if (!imp.files.length) imp.deck = ""; rebuild(); importView(v) } });
  v.querySelectorAll("[data-m]").forEach(function (b) { b.onclick = function () { imp.method = b.dataset.m; rebuild(); importView(v) } });
  files.forEach(function (f) { if (f.state === "reading") progSet("fp" + f.id, f.pct, f.label) });
  [["o1", "key"], ["o2", "terms"], ["o3", "cloze"], ["o4", "img"]].forEach(function (x) { var c = $("#" + x[0]); if (c) c.onchange = function () { o[x[1]] = c.checked; rebuild(); autoCount(); step3(v) } });
  autoCount(); aiWire(v); step3(v)
}
function autoCount() {
  var c = $("#ocount"); if (!c) return; var n = gen(imp.secs, iopts()).length;
  c.textContent = n ? n + " cards were made from the slide text. Review them below." : "No cards were made. Turn on more options above."
}
/* step 3: review with search and filters */
function visibleItems() {
  var q = (imp.q || "").toLowerCase().trim(), fs = imp.fs || "all", ft = imp.ft || "all", fsrc = imp.fsrc || "all";
  return imp.items.map(function (x, i) { return { x: x, i: i } }).filter(function (p) {
    var x = p.x, c = x.c;
    if (q && ((c.q || "") + " " + (c.a || "")).toLowerCase().indexOf(q) < 0) return false;
    if (fs === "on" && !x.on) return false; if (fs === "off" && x.on) return false; if (fs === "dup" && !x.dup) return false; if (fs === "check" && !c.note) return false;
    if (ft !== "all" && kind(c) !== ft) return false; if (fsrc !== "all" && c.file !== fsrc) return false; return true
  })
}
function itemHTML(x, i) {
  var c = x.c;
  return '<div class="item"><input type="checkbox" data-i="' + i + '" aria-label="Include card"' + (x.on ? " checked" : "") + '>' + (c.img ? '<img alt="" src="' + c.img + '">' : "") + '<div class="body"><div>' + esc((c.q || "").replace(/\n/g, " ")) + '</div><div class="a">' + esc((c.a || "").replace(/\n/g, " ")) + '</div>' + (c.note ? '<div class="a"><b>Check:</b> ' + esc(c.note) + '</div>' : "") + '</div>' + (x.dup ? '<span class="chip warn">duplicate</span>' : "") + (c.ai ? '<span class="chip">AI</span>' : "") + (imp.multiSrc && c.file ? '<span class="chip">' + esc(aiShort(c.file)) + '</span>' : "") + '<span class="chip">' + kind(c) + '</span></div>'
}
function paintCounts() {
  var on = imp.items.filter(function (x) { return x.on }).length, vis = visibleItems(), hidden = on - vis.filter(function (p) { return p.x.on }).length;
  var ct = $("#icount"); if (ct) ct.textContent = "Showing " + vis.length + " of " + imp.items.length + " cards";
  var hd = $("#ihid"); if (hd) hd.textContent = hidden > 0 ? hidden + " selected card" + (hidden > 1 ? "s are" : " is") + " hidden by your search or filters and will still be added." : "";
  var ad = $("#ad"); if (ad) { ad.textContent = "Add " + on + " selected card" + (on === 1 ? "" : "s"); ad.disabled = !on }
}
function paintList() {
  var box = $("#ilist"); if (!box) return; var vis = visibleItems();
  box.innerHTML = vis.length ? vis.map(function (p) { return itemHTML(p.x, p.i) }).join("") : '<p class="hint">No cards match. Clear the search or change the filters.</p>';
  box.querySelectorAll("[data-i]").forEach(function (c) { c.onchange = function () { var x = imp.items[+c.dataset.i]; x.on = c.checked; x.touched = true; paintCounts() } });
  paintCounts()
}
function step3(v) {
  var host = $("#istep3"); if (!host) return;
  if (!imp.items.length) { host.innerHTML = ""; return }
  var srcs = []; imp.items.forEach(function (x) { if (x.c.file && srcs.indexOf(x.c.file) < 0) srcs.push(x.c.file) }); imp.multiSrc = srcs.length > 1; if (!imp.multiSrc || srcs.indexOf(imp.fsrc) < 0 && imp.fsrc !== "all") imp.fsrc = "all";
  var nd = imp.items.filter(function (x) { return x.dup }).length, fs = imp.fs || "all", ft = imp.ft || "all", fsrc = imp.fsrc || "all", hasNote = imp.items.some(function (x) { return x.c.note }); if (fs === "check" && !hasNote) fs = imp.fs = "all";
  host.innerHTML = '<div class="panel"><h2>3. Review ' + imp.items.length + ' cards</h2><p class="hint">Uncheck anything you don\'t want. ' + (nd ? '<b>' + nd + ' look like duplicates</b> (same prompt already in the deck or earlier in this import) and start unchecked.' : 'No duplicates found.') + ' New cards are taught in your next study session.</p>' +
    '<label for="idn">Add to deck</label><input type="text" id="idn" value="' + esc(imp.deck || "My deck") + '">' +
    '<div class="toolbar"><input type="search" id="is" placeholder="Search these cards" aria-label="Search cards" value="' + esc(imp.q || "") + '">' +
    '<select id="ifs" aria-label="Show which cards"><option value="all"' + (fs === "all" ? " selected" : "") + '>All cards</option><option value="on"' + (fs === "on" ? " selected" : "") + '>Selected</option><option value="off"' + (fs === "off" ? " selected" : "") + '>Not selected</option><option value="dup"' + (fs === "dup" ? " selected" : "") + '>Possible duplicates</option>' + (hasNote ? '<option value="check"' + (fs === "check" ? " selected" : "") + '>Needs checking</option>' : "") + '</select>' +
    (imp.multiSrc ? '<select id="ifsrc" aria-label="Which lesson">' + [["all", "All lessons"]].concat(srcs.map(function (f) { return [f, aiShort(f)] })).map(function (t) { return '<option value="' + esc(t[0]) + '"' + (fsrc === t[0] ? " selected" : "") + '>' + esc(t[1]) + '</option>' }).join("") + '</select>' : "") + '<select id="ift" aria-label="Card type">' + [["all", "All types"], ["text", "Text"], ["fill-in", "Fill-in"], ["image", "Image"], ["audio", "Audio"]].map(function (t) { return '<option value="' + t[0] + '"' + (ft === t[0] ? " selected" : "") + '>' + t[1] + '</option>' }).join("") + '</select></div>' +
    '<p class="hint" id="icount" role="status"></p><div class="row"><button class="sm" id="sa" type="button">Select shown</button><button class="sm" id="sn" type="button">Deselect shown</button><button class="sm" id="sd" type="button">Select shown, skip duplicates</button></div>' +
    '<div id="ilist" class="review"></div><p class="hint" id="ihid"></p><div class="row"><button class="primary" id="ad" type="button">Add</button></div></div>';
  paintList();
  $("#is").oninput = function () { imp.q = this.value; paintList() };
  $("#ifs").onchange = function () { imp.fs = this.value; paintList() }; $("#ift").onchange = function () { imp.ft = this.value; paintList() }; if ($("#ifsrc")) $("#ifsrc").onchange = function () { imp.fsrc = this.value; paintList() };
  function setShown(fn) { visibleItems().forEach(function (p) { p.x.on = fn(p.x); p.x.touched = true }); paintList() }
  $("#sa").onclick = function () { setShown(function () { return true }) }; $("#sn").onclick = function () { setShown(function () { return false }) }; $("#sd").onclick = function () { setShown(function (x) { return !x.dup }) };
  $("#idn").oninput = function () { imp.deck = this.value }; $("#idn").onchange = function () { markDups(true); step3(v) };
  $("#ad").onclick = function () {
    var cnt = 0, skip = nd ? imp.items.filter(function (x) { return x.dup && !x.on }).length : 0, last = "";
    imp.items.forEach(function (x) { if (!x.on) return; var d = ensureDeck(x.c.deck || imp.deck); last = d; DB.cards.push(mk(x.c, d)); cnt++ });
    if (!cnt) return; if (DB.decks.length === 1) DB.cur = last; save(); imp = { direct: [], secs: [], items: [], deck: "", msg: "", files: [] }; tab = "dash"; render();
    toast("Added " + cnt + " cards" + (skip ? " and skipped " + skip + " duplicates" : "") + ". Press Start studying to learn them.")
  }
}
