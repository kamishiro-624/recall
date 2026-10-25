/* create / edit */
function readURL(f) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result) }; r.readAsDataURL(f) }) }
function readImg(f) { return new Promise(function (res) { readURL(f).then(function (u) { var im = new Image(); im.onload = function () { var s = Math.min(1, 1000 / Math.max(im.width, im.height)); if (s === 1 || /svg|gif/.test(f.type)) return res(u); var c = document.createElement("canvas"); c.width = im.width * s; c.height = im.height * s; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", .82)) }; im.onerror = function () { res(u) }; im.src = u }) }) }
/* multiple choice: up to four choices and which one is right; the Answer box then holds the explanation */
function formFrom(c) {
  var f = { id: c.id, deck: deckName(c.deck), q: c.q, a: c.a, img: c.img, aud: c.aud, ch: ["", "", "", ""], ci: 0, cx: ["", "", "", ""], ok: false };
  if (c.cx) c.cx.slice(0, 4).forEach(function (x, i) { f.cx[i] = x || "" });
  if (c.ch && c.ch.length > 1) { c.ch.slice(0, 4).forEach(function (x, i) { f.ch[i] = x }); f.ci = Math.min(3, c.ci || 0); var cor = c.ch[c.ci] || ""; f.a = cor && String(c.a).indexOf(cor + "\n") === 0 ? String(c.a).slice(cor.length + 1) : (String(c.a) === cor ? "" : c.a) }
  return f
}
function mcFields(f) {
  var ch = (f.ch || []).map(function (x) { return String(x).trim() }), idx = []; ch.forEach(function (x, i) { if (x) idx.push(i) });
  if (idx.length < 2) return null; var cor = ch[f.ci]; if (!cor) return { error: "Pick which choice is the correct one." };
  var cx = idx.map(function (i) { return String((f.cx || [])[i] || "").trim() });
  return { ch: idx.map(function (i) { return ch[i] }), ci: idx.indexOf(f.ci), cx: cx.some(Boolean) ? cx : undefined, a: cor + (f.a.trim() ? "\n" + f.a.trim() : "") }
}
function addView(v) {
  var dn = form.deck || (DB.cur !== "all" ? deckName(DB.cur) : "") || "My deck";
  v.innerHTML = (form.id ? "" : addSeg("add")) + '<div class="panel"><h2>' + (form.id ? "Edit card" : "Write a card") + '</h2><label for="fd">Deck</label><input type="text" id="fd" list="dl" value="' + esc(dn) + '"><datalist id="dl">' + DB.decks.map(function (d) { return '<option value="' + esc(d.name) + '">' }).join("") + '</datalist>' +
    '<label for="fq">Prompt <span class="hint">(for fill-in-the-blank, write {{c1::the hidden words}} in a sentence)</span></label><textarea id="fq">' + esc(form.q) + '</textarea>' +
    '<label for="fa">Answer <span class="hint">(for multiple choice, write the explanation here)</span></label><textarea id="fa">' + esc(form.a) + '</textarea>' +
    '<details class="adv" id="mcd"' + (form.ch.some(function (x) { return x }) ? " open" : "") + '><summary>Make it multiple choice (optional)</summary><p class="hint">Type two to four choices and mark the correct one. Students tap an answer instead of typing, and it is graded for them.</p>' +
    [0, 1, 2, 3].map(function (i) { return '<div class="mc-edit"><input type="radio" name="fci" value="' + i + '" aria-label="Choice ' + "ABCD"[i] + ' is correct"' + (form.ci === i ? " checked" : "") + '><div class="mc-edit-f"><input type="text" class="fch" data-i="' + i + '" placeholder="Choice ' + "ABCD"[i] + '" value="' + esc(form.ch[i] || "") + '"><input type="text" class="fcx" data-i="' + i + '" placeholder="Why is it right or wrong? (optional)" value="' + esc((form.cx || [])[i] || "") + '"></div></div>' }).join("") + '</details>' +
    '<label for="fi">Picture (optional)</label><input type="file" id="fi" accept="image/*">' +
    '<label for="fu">Audio (optional): upload or record</label><input type="file" id="fu" accept="audio/*"><div class="row"><button id="rec">Record audio</button><span class="hint" id="recs"></span></div><div id="pv">' + media(form) + '</div>' +
    '<div class="row"><button class="primary" id="sv">' + (form.id ? "Save changes" : "Add card") + '</button>' + (form.id ? '<button id="cx">Cancel</button>' : "") + '</div><p class="hint" id="msg" role="status"></p></div>';
  wireSeg(v);
  function touched() { form.ok = false; var b = $("#sv"); if (b) b.textContent = form.id ? "Save changes" : "Add card" }
  $("#fq").oninput = function () { form.q = this.value; touched() }; $("#fa").oninput = function () { form.a = this.value; touched() }; $("#fd").oninput = function () { form.deck = this.value; touched() };
  v.querySelectorAll(".fch").forEach(function (i) { i.oninput = function () { form.ch[+i.dataset.i] = i.value; touched() } });
  v.querySelectorAll(".fcx").forEach(function (i) { i.oninput = function () { form.cx = form.cx || ["", "", "", ""]; form.cx[+i.dataset.i] = i.value; touched() } });
  v.querySelectorAll('input[name="fci"]').forEach(function (r) { r.onchange = function () { form.ci = +r.value; touched() } });
  $("#fi").onchange = async function () { if (this.files[0]) { form.img = await readImg(this.files[0]); $("#pv").innerHTML = media(form) } };
  $("#fu").onchange = async function () { if (this.files[0]) { form.aud = await readURL(this.files[0]); $("#pv").innerHTML = media(form) } };
  var mr = null; $("#rec").onclick = async function () {
    if (mr) { mr.stop(); return }
    try {
      var st = await navigator.mediaDevices.getUserMedia({ audio: true }), ch = []; mr = new MediaRecorder(st); mr.ondataavailable = function (e) { ch.push(e.data) };
      mr.onstop = async function () { st.getTracks().forEach(function (t) { t.stop() }); form.aud = await readURL(new Blob(ch, { type: mr.mimeType || "audio/webm" })); mr = null; $("#rec").textContent = "Record audio"; $("#recs").textContent = "Recorded."; $("#pv").innerHTML = media(form) };
      mr.start(); this.textContent = "Stop recording"; $("#recs").textContent = "Recording…"
    } catch (e) { mr = null; $("#recs").textContent = "Microphone isn't available here. Upload an audio file instead." }
  };
  $("#sv").onclick = function () {
    if (!form.q.trim() && !form.img && !form.aud) { say("Add a prompt, picture or audio first."); return }
    var mc = mcFields(form); if (mc && mc.error) { say(mc.error); return }
    if (!form.a.trim() && kind(form) !== "fill-in" && !mc) { say("Add an answer to check yourself against."); return }
    var dup = findDup(form, deckId(form.deck || dn), form.id);
    if (dup && !form.ok) { form.ok = true; $("#sv").textContent = form.id ? "Save anyway" : "Add anyway"; say("This deck already has a card with the same prompt" + (dup.a.trim() !== form.a.trim() ? " (its answer: \u201c" + dup.a.slice(0, 60) + "\u201d)" : "") + ". Edit this one, or choose the button again to " + (form.id ? "save" : "add") + " it anyway."); return }
    var d = ensureDeck(form.deck || dn);
    if (form.id) { var c = DB.cards.find(function (x) { return x.id === form.id }); if (c) { c.q = form.q; c.a = mc ? mc.a : form.a; c.ch = mc ? mc.ch : undefined; c.ci = mc ? mc.ci : undefined; c.cx = mc ? mc.cx : undefined; c.img = form.img; c.aud = form.aud; c.deck = d; c.u = Date.now() } form = blank(); tab = "lib"; save(); render(); return }
    var nc = mk(form, d); if (mc) { nc.ch = mc.ch; nc.ci = mc.ci; nc.cx = mc.cx; nc.a = mc.a } else { nc.ch = undefined; nc.ci = undefined; nc.cx = undefined } DB.cards.push(nc); save(); form = blank(); form.deck = deckName(d); render(); say("Card added. It will appear as a new card in your next study session.")
  };
  if ($("#cx")) $("#cx").onclick = function () { form = blank(); tab = "lib"; render() }
}
