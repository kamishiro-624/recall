/* File parsers (pptx, docx, csv/tsv, txt/md, json) and card generation */
/* import: parse files into sections or direct cards */
function num(n) { return +(n.match(/(\d+)\.xml$/) || [0, 0])[1] }
function txt(el) { var o = []; var t = el.getElementsByTagName("a:t"); for (var i = 0; i < t.length; i++)o.push(t[i].textContent); return o.join("").trim() }
function xml(s) { return new DOMParser().parseFromString(s, "application/xml") }
var MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };
async function readPptx(buf, name, prog) {
  var z = await JSZip.loadAsync(buf), secs = [];
  var names = Object.keys(z.files).filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/.test(n) }).sort(function (a, b) { return num(a) - num(b) });
  if (prog) prog(0, names.length);
  for (var k = 0; k < names.length; k++) {
    var n = names[k], doc = xml(await z.file(n).async("string")), title = "", body = [], imgs = [], notes = "";
    var sps = doc.getElementsByTagName("p:sp");
    for (var i = 0; i < sps.length; i++) {
      var ph = sps[i].getElementsByTagName("p:ph")[0], ty = ph ? ph.getAttribute("type") : ""; if (/sldNum|ftr|dt/.test(ty || "")) continue;
      var ps = sps[i].getElementsByTagName("a:p"), ts = []; for (var j = 0; j < ps.length; j++) { var t = txt(ps[j]); if (t) ts.push(t) }
      if (ty === "title" || ty === "ctrTitle") title = ts.join(" "); else body = body.concat(ts)
    }
    var cells = doc.getElementsByTagName("a:tc"); for (var c = 0; c < cells.length; c++) { var ct = txt(cells[c]); if (ct) body.push(ct) }
    if (!title && body.length) title = body.shift();
    var rp = n.replace("slides/", "slides/_rels/") + ".rels", rf = z.file(rp);
    if (rf) {
      var rd = xml(await rf.async("string")), rels = rd.getElementsByTagName("Relationship");
      for (var r = 0; r < rels.length; r++) {
        var ty2 = rels[r].getAttribute("Type") || "", tg = (rels[r].getAttribute("Target") || "").replace(/^\.\.\//, "").replace(/^\//, "");
        if (/\/image$/.test(ty2)) { var ext = tg.split(".").pop().toLowerCase(), f = z.file("ppt/" + tg) || z.file(tg); if (f && MIME[ext]) { var b = await f.async("base64"); if (b.length < 1500000) imgs.push("data:" + MIME[ext] + ";base64," + b) } }
        if (/\/notesSlide$/.test(ty2)) { var nf = z.file("ppt/" + tg); if (nf) { var nd = xml(await nf.async("string")), nsp = nd.getElementsByTagName("p:sp"); for (var q = 0; q < nsp.length; q++) { var nph = nsp[q].getElementsByTagName("p:ph")[0]; if (nph && nph.getAttribute("type") === "body") notes = txt(nsp[q]) } } }
      }
    }
    if (title || body.length || imgs.length) secs.push({ title: title || "Slide " + (k + 1), body: body, imgs: imgs, notes: notes })
    if (prog) { prog(k + 1, names.length); await new Promise(function (r) { setTimeout(r, 0) }) }
  }
  return secs
}
async function readDocx(buf, name) {
  var z = await JSZip.loadAsync(buf), doc = xml(await z.file("word/document.xml").async("string")), ps = doc.getElementsByTagName("w:p"), secs = [], cur = null;
  for (var i = 0; i < ps.length; i++) {
    var ts = ps[i].getElementsByTagName("w:t"), t = ""; for (var j = 0; j < ts.length; j++)t += ts[j].textContent; t = t.trim(); if (!t) continue;
    var st = ps[i].getElementsByTagName("w:pStyle")[0], sv = st ? st.getAttribute("w:val") : "";
    if (/^(Heading\d|Title)/i.test(sv)) { cur = { title: t, body: [], imgs: [], notes: "" }; secs.push(cur) } else { if (!cur) { cur = { title: name, body: [], imgs: [], notes: "" }; secs.push(cur) } cur.body.push(t) }
  }
  return secs
}
function clean(s) { var im = (s.match(/<img[^>]+src=["'](data:[^"']+)["']/i) || [])[1] || ""; if (/<[a-z\/]/i.test(s)) s = s.replace(/<br\s*\/?>|<\/div>|<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); return { t: s.trim(), img: im } }
function parseDelim(text, sep) { var rows = [], row = [], f = "", q = false; for (var i = 0; i < text.length; i++) { var ch = text[i]; if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += ch } else if (ch === '"' && f === "") q = true; else if (ch === sep) { row.push(f); f = "" } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = "" } else f += ch } if (f !== "" || row.length) { row.push(f); rows.push(row) } return rows }
function fromDelim(text) {
  var sep = null, m = text.match(/^#separator:(\w+)/m); if (m) sep = { tab: "\t", comma: ",", semicolon: ";", pipe: "|", space: " " }[m[1].toLowerCase()] || null;
  text = text.split(/\r?\n/).filter(function (l, i, a) { return !/^#/.test(l) }).join("\n");
  var first = text.split("\n")[0] || ""; if (!sep) { var tb = (first.match(/\t/g) || []).length, cm = (first.match(/,/g) || []).length, sc = (first.match(/;/g) || []).length; sep = tb > 0 && tb >= cm ? "\t" : sc > cm ? ";" : "," }
  var rows = parseDelim(text, sep), out = [];
  rows.forEach(function (r, i) {
    if (!r[0] || !r[0].trim()) return; if (i === 0 && /^(front|question|term|prompt|word|q)$/i.test(r[0].trim())) return;
    var a = clean(r[0]), b = clean(r[1] || ""); out.push({ q: a.t, a: b.t, img: a.img || b.img, aud: "", deck: /^(deck)$/i.test("") ? "" : "" })
  });
  return out
}
function fromText(text, name) {
  var lines = text.split(/\r?\n/), direct = [], data = lines.filter(function (l) { return l.trim() && !/^#/.test(l) }), tabs = data.filter(function (l) { return /\t/.test(l) }).length;
  if (/^#separator:/m.test(text) || (data.length && tabs > data.length / 2)) return { direct: fromDelim(text), secs: [] };
  lines.forEach(function (l) { l = l.trim(); if (!l) return; if (/\{\{c\d+::/.test(l)) direct.push({ q: l, a: "" }); else { var m = l.match(/^(.+?)\s*::\s*(.+)$/); if (m) direct.push({ q: m[1], a: m[2] }) } });
  if (direct.length) return { direct: direct, secs: [] };
  var secs = [], cur = null; lines.forEach(function (l) { var t = l.trim(); if (!t) return; var h = t.match(/^#{1,4}\s+(.*)/); if (h) { cur = { title: h[1], body: [], imgs: [], notes: "" }; secs.push(cur) } else { if (!cur) { cur = { title: name, body: [], imgs: [], notes: "" }; secs.push(cur) } cur.body.push(t.replace(/^[-*•]\s+/, "")) } });
  return { direct: [], secs: secs }
}
function fromJSON(text) {
  var o = JSON.parse(text), direct = [];
  if (o && o.format === "recall") { var dm = {}; (o.decks || []).forEach(function (d) { dm[d.id] = d.name }); return { direct: (o.cards || []).map(function (c) { return { q: c.q, a: c.a, img: c.img, aud: c.aud, deck: dm[c.deck] || "", box: c.box, due: c.due, stage: c.stage, seen: c.seen, miss: c.miss, ch: c.ch, ci: c.ci, cx: c.cx, alt: c.alt } }), secs: [] } }
  var arr = Array.isArray(o) ? o : (o.cards || o.notes || o.terms || o.items || []);
  arr.forEach(function (x) { var q = x.q || x.front || x.Front || x.question || x.term || x.prompt || x.word || "", a = x.a || x.back || x.Back || x.answer || x.definition || x.def || ""; if (q) direct.push({ q: String(q), a: String(a), img: x.img || x.image || "", aud: x.aud || "" }) });
  return { direct: direct, secs: [] }
}
/* generate cards from sections */
function gen(secs, o) {
  var out = [];
  secs.forEach(function (s) {
    var terms = [], rest = [];
    s.body.forEach(function (b) { var m = b.match(/^(.{2,60}?)\s*(?::|\u2013|\u2014| - )\s+(.{6,})$/); if (o.terms && m) terms.push(m); else rest.push(b) });
    terms.forEach(function (m) { out.push({ q: m[1], a: m[2], src: s.title, file: s.file }) });
    if (o.key && (rest.length || s.notes)) { var a = rest.map(function (x) { return "• " + x }).join("\n"); if (s.notes) a += (a ? "\n\n" : "") + "Speaker notes: " + s.notes; out.push({ q: "Key points: " + s.title, a: a, src: s.title, file: s.file }) }
    if (o.cloze) { var n = 0; rest.forEach(function (b) { if (n >= 2) return; var w = b.split(/\s+/); if (w.length < 6) return; var best = ""; w.forEach(function (x) { var y = x.replace(/[^\p{L}\p{N}-]/gu, ""); if (y.length > best.length && y.length >= 6) best = y }); if (!best) return; out.push({ q: b.replace(best, "{{c1::" + best + "}}"), a: "", src: s.title, file: s.file }); n++ }) }
    if (o.img) s.imgs.slice(0, 2).forEach(function (im) { out.push({ q: "What concept does this picture illustrate?", a: s.title + (rest[0] ? "\n" + rest[0] : ""), img: im, src: s.title, file: s.file }) })
  });
  return out
}
