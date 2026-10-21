/* Import screen: review generated cards before adding, with duplicate detection */
function opts() { return { key: $("#o1").checked, terms: $("#o2").checked, cloze: $("#o3").checked, img: $("#o4").checked } }
function markDups(keepTouched) {
  var seen = {}, all = S().dupScope === "all", def = deckId(imp.deck || "My deck");
  imp.items.forEach(function (x) {
    var did = x.c.deck ? deckId(x.c.deck) : def, k = (all ? "" : did) + "#" + dkey(x.c), db = findDup(x.c, did);
    x.dup = db ? "deck" : seen[k] ? "batch" : ""; seen[k] = 1; if (!(keepTouched && x.touched)) x.on = !x.dup
  })
}
function rebuild() {
  var o = imp.o || { key: true, terms: true, cloze: true, img: true }; if ($("#o1")) o = opts(); imp.o = o;
  imp.items = imp.direct.map(function (c) { return { c: c, on: true } }).concat((imp.ai || []).map(function (c) { return { c: c, on: true } })).concat(gen(imp.secs, o).map(function (c) { return { c: c, on: true } })); markDups(false)
}
async function ingest(files) {
  imp.msg = "Reading…"; importView($("#view"));
  for (var i = 0; i < files.length; i++) {
    var f = files[i], ext = f.name.split(".").pop().toLowerCase(), base = f.name.replace(/\.[^.]+$/, ""); if (!imp.deck) imp.deck = base;
    try {
      if (ext === "pptx") { imp.secs = imp.secs.concat(await readPptx(await f.arrayBuffer(), base)) }
      else if (ext === "docx") { imp.secs = imp.secs.concat(await readDocx(await f.arrayBuffer(), base)) }
      else if (ext === "json") { imp.direct = imp.direct.concat(fromJSON(await f.text()).direct) }
      else if (ext === "csv" || ext === "tsv") { imp.direct = imp.direct.concat(fromDelim(await f.text())) }
      else if (ext === "ppt" || ext === "doc" || ext === "pdf") { imp.msg = "Old .ppt/.doc and PDF files can't be read in the browser. Save as .pptx or .docx, or paste the text." }
      else { var r = fromText(await f.text(), base); imp.direct = imp.direct.concat(r.direct); imp.secs = imp.secs.concat(r.secs) }
    }
    catch (e) { imp.msg = "Couldn't read " + f.name + ". It may be damaged or password protected." }
  }
  rebuild(); if (!imp.items.length && !/Old/.test(imp.msg)) imp.msg = "Nothing usable found. Try a deck with text on the slides, or paste notes."; else if (imp.items.length) imp.msg = "";
  importView($("#view"))
}
function importView(v) {
  var n = imp.items.filter(function (x) { return x.on }).length, nd = imp.items.filter(function (x) { return x.dup }).length, o = imp.o || { key: true, terms: true, cloze: true, img: true };
  v.innerHTML = addSeg("import") + '<div class="panel"><h2>Add cards from a file or notes</h2><p class="hint">Slide decks (.pptx) and documents (.docx) become cards automatically. Also reads .txt, .md, .csv, .tsv and .json, including Anki and Quizlet exports.</p>' +
    '<div class="drop" id="drop"><input type="file" id="ff" multiple accept=".pptx,.docx,.txt,.md,.csv,.tsv,.json"><p>Choose files or drop them here</p></div>' +
    '<label for="pt">Or paste notes (term :: definition, tab-separated, or headings with bullets)</label><textarea id="pt"></textarea><div class="row"><button id="pb">Read pasted notes</button></div>' +
    '<h3>Card generation from slides and documents</h3><div class="opts"><label><input type="checkbox" id="o1"' + (o.key ? " checked" : "") + '> Key-points card for each slide or section</label><label><input type="checkbox" id="o2"' + (o.terms ? " checked" : "") + '> Term cards from lines like "Term: definition"</label><label><input type="checkbox" id="o3"' + (o.cloze ? " checked" : "") + '> Fill-in-the-blank cards from longer sentences</label><label><input type="checkbox" id="o4"' + (o.img ? " checked" : "") + '> Image cards from slide pictures</label></div><p class="hint" id="msg" role="status">' + esc(imp.msg) + '</p>' + aiPanel() + '</div>' +
    (imp.items.length ? '<div class="panel"><h2>Review ' + imp.items.length + ' cards</h2><p class="hint">Uncheck anything you don\'t want. ' + (nd ? '<b>' + nd + ' look like duplicates</b> (same prompt already in the deck or earlier in this import) and start unchecked.' : 'No duplicates found.') + ' New cards are taught in your next study session.</p><label for="idn">Add to deck</label><input type="text" id="idn" value="' + esc(imp.deck || "My deck") + '"><div class="row"><button class="sm" id="sa">Select all</button><button class="sm" id="sn">Select none</button><button class="sm" id="sd">Select all but duplicates</button></div>' +
      imp.items.map(function (x, i) { var c = x.c; return '<div class="item"><input type="checkbox" data-i="' + i + '" aria-label="Include card"' + (x.on ? " checked" : "") + '>' + (c.img ? '<img alt="" src="' + c.img + '">' : "") + '<div class="body"><div>' + esc((c.q || "").replace(/\n/g, " ")) + '</div><div class="a">' + esc((c.a || "").replace(/\n/g, " ")) + '</div>' + (c.note ? '<div class="a"><b>Check:</b> ' + esc(c.note) + '</div>' : "") + '</div>' + (x.dup ? '<span class="chip warn">duplicate</span>' : "") + (c.ai ? '<span class="chip">AI</span>' : "") + '<span class="chip">' + kind(c) + '</span></div>' }).join("") +
      '<div class="row"><button class="primary" id="ad">Add ' + n + ' cards</button></div></div>' : "");
  wireSeg(v);
  var ff = $("#ff"); ff.onchange = function () { ingest(ff.files) }; var dr = $("#drop");
  dr.ondragover = function (e) { e.preventDefault(); dr.classList.add("over") }; dr.ondragleave = function () { dr.classList.remove("over") }; dr.ondrop = function (e) { e.preventDefault(); dr.classList.remove("over"); ingest(e.dataTransfer.files) };
  $("#pb").onclick = function () { var t = $("#pt").value; if (!t.trim()) return; var r = fromText(t, "Pasted notes"); imp.direct = imp.direct.concat(r.direct); imp.secs = imp.secs.concat(r.secs); if (!imp.deck) imp.deck = "Pasted notes"; rebuild(); imp.msg = imp.items.length ? "" : "Nothing usable found."; importView(v) };
  ["o1", "o2", "o3", "o4"].forEach(function (id) { $("#" + id).onchange = function () { rebuild(); importView(v) } });
  aiWire(v);
  if (imp.items.length) {
    document.querySelectorAll("[data-i]").forEach(function (c) { c.onchange = function () { var x = imp.items[+c.dataset.i]; x.on = c.checked; x.touched = true; $("#ad").textContent = "Add " + imp.items.filter(function (y) { return y.on }).length + " cards" } });
    $("#idn").oninput = function () { imp.deck = this.value }; $("#idn").onchange = function () { markDups(true); importView(v) };
    $("#sa").onclick = function () { imp.items.forEach(function (x) { x.on = true; x.touched = true }); importView(v) }; $("#sn").onclick = function () { imp.items.forEach(function (x) { x.on = false; x.touched = true }); importView(v) }; $("#sd").onclick = function () { imp.items.forEach(function (x) { x.on = !x.dup; x.touched = true }); importView(v) };
    $("#ad").onclick = function () { var cnt = 0, skip = nd ? imp.items.filter(function (x) { return x.dup && !x.on }).length : 0, last = ""; imp.items.forEach(function (x) { if (!x.on) return; var d = ensureDeck(x.c.deck || imp.deck); last = d; DB.cards.push(mk(x.c, d)); cnt++ }); if (!cnt) return; if (DB.decks.length === 1) DB.cur = last; save(); imp = { direct: [], secs: [], items: [], deck: "", msg: "" }; tab = "dash"; render(); toast("Added " + cnt + " cards" + (skip ? " and skipped " + skip + " duplicates" : "") + ". Press Start studying to learn them.") }
  }
}
