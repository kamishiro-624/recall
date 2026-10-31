/* Edit a card without leaving a lesson, review or practice round.
   An "Edit card" button sits on every card shown in the study session; it opens this dialog on top of the session, so the queue, progress and
   your place are kept. Saving changes the wording, answer, choices, picture or audio of the card only: its level and review date are not touched. */
function editBtn() { return '<button type="button" class="sm ed-card" id="edcard" title="Fix a mistake on this card">Edit card</button>' }
function wireEdit(v) { var b = $("#edcard", v); if (b) b.onclick = editCurrentCard }
function editCurrentCard() {
    var s = sess; if (!s) return;
    var c = s.phase === "teach" ? s.batch[s.ti] : s.cur; if (!c || !alive(c)) return;
    var before = JSON.stringify([kind(c), c.ch, c.ci]);
    editCardDialog(c).then(function (saved) {
        if (!saved || sess !== s) return;
        /* if the card changed shape (for example text became multiple choice) the shown answer state no longer fits, so start the card again */
        if (JSON.stringify([kind(c), c.ch, c.ci]) !== before) { s.r = 0; s.order = null; s.pick = -1; s.mine = ""; s.draft = "" }
        if (!s.r) s.t0 = 0;
        render(); toast("Card updated. Its level and review date were not changed.")
    })
}
/* Resolves to true when the card was saved, false when the dialog was cancelled */
function editCardDialog(c) {
    return new Promise(function (res) {
        var f = formFrom(c), prev = document.activeElement, d = document.createElement("dialog"), warned = false;
        d.className = "cbox wide edit-dlg"; d.setAttribute("aria-labelledby", "edt");
        d.innerHTML = '<h2 id="edt">Edit card</h2>' +
            '<label for="edq">Prompt <span class="hint">(for fill-in-the-blank, write {{c1::the hidden words}} in a sentence)</span></label><textarea id="edq"></textarea>' +
            '<label for="eda">Answer <span class="hint">(for multiple choice, write the explanation here)</span></label><textarea id="eda"></textarea>' +
            '<details class="adv" id="edmc"' + (f.ch.some(function (x) { return x }) ? " open" : "") + '><summary>Multiple choice</summary><p class="hint">Two to four choices, with the correct one marked. Leave them all empty for a normal card.</p>' +
            [0, 1, 2, 3].map(function (i) { return '<div class="mc-edit"><input type="radio" name="eci" value="' + i + '" aria-label="Choice ' + "ABCD"[i] + ' is correct"' + (f.ci === i ? " checked" : "") + '><div class="mc-edit-f"><input type="text" class="ech" data-i="' + i + '" placeholder="Choice ' + "ABCD"[i] + '"><input type="text" class="ecx" data-i="' + i + '" placeholder="Why is it right or wrong? (optional)"></div></div>' }).join("") + '</details>' +
            '<label for="edi">Picture</label><input type="file" id="edi" accept="image/*"><label for="edu">Audio</label><input type="file" id="edu" accept="audio/*">' +
            '<div id="edpv"></div><div class="row" id="edrm"></div><p class="hint" id="edmsg" role="status"></p>' +
            '<div class="row cbtns"><button type="button" id="edn">Cancel</button><button type="button" id="edy" class="primary">Save changes</button></div>';
        document.body.appendChild(d);
        var q = d.querySelector("#edq"), a = d.querySelector("#eda"), msg = d.querySelector("#edmsg"), ok = d.querySelector("#edy");
        q.value = f.q; a.value = f.a;
        d.querySelectorAll(".ech").forEach(function (i) { i.value = f.ch[+i.dataset.i] || "" });
        d.querySelectorAll(".ecx").forEach(function (i) { i.value = (f.cx || [])[+i.dataset.i] || "" });
        function say2(t) { msg.textContent = t }
        function touched() { if (warned) { warned = false; ok.textContent = "Save changes" } }
        function media2() {
            d.querySelector("#edpv").innerHTML = media(f);
            d.querySelector("#edrm").innerHTML = (f.img ? '<button type="button" class="sm" id="edri">Remove picture</button>' : "") + (f.aud ? '<button type="button" class="sm" id="edru">Remove audio</button>' : "");
            var ri = d.querySelector("#edri"), ru = d.querySelector("#edru");
            if (ri) ri.onclick = function () { f.img = ""; d.querySelector("#edi").value = ""; media2(); touched() };
            if (ru) ru.onclick = function () { f.aud = ""; d.querySelector("#edu").value = ""; media2(); touched() }
        }
        media2();
        d.querySelector("#edi").onchange = async function () { if (this.files[0]) { f.img = await readImg(this.files[0]); media2() } };
        d.querySelector("#edu").onchange = async function () { if (this.files[0]) { f.aud = await readURL(this.files[0]); media2() } };
        d.addEventListener("input", touched);
        var done = function (v) { d.close(); d.remove(); if (prev && prev.focus && prev.isConnected) try { prev.focus() } catch (e) { } res(v) };
        d.querySelector("#edn").onclick = function () { done(false) };
        d.addEventListener("cancel", function (e) { e.preventDefault(); done(false) });
        d.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.target.tagName === "TEXTAREA") { e.preventDefault(); ok.click() } });
        ok.onclick = function () {
            f.q = q.value; f.a = a.value;
            d.querySelectorAll(".ech").forEach(function (i) { f.ch[+i.dataset.i] = i.value });
            d.querySelectorAll(".ecx").forEach(function (i) { f.cx[+i.dataset.i] = i.value });
            var r = d.querySelector('input[name="eci"]:checked'); f.ci = r ? +r.value : 0;
            if (!f.q.trim() && !f.img && !f.aud) { say2("Add a prompt, picture or audio first."); return }
            var mc = mcFields(f); if (mc && mc.error) { say2(mc.error); return }
            if (!f.a.trim() && kind(f) !== "fill-in" && !mc) { say2("Add an answer to check yourself against."); return }
            var dup = findDup(f, c.deck, c.id);
            if (dup && !warned) { warned = true; ok.textContent = "Save anyway"; say2("Another card in this deck already has the same prompt. Change it, or choose Save anyway."); return }
            c.q = f.q; c.a = mc ? mc.a : f.a; c.ch = mc ? mc.ch : undefined; c.ci = mc ? mc.ci : undefined; c.cx = mc ? mc.cx : undefined; c.img = f.img; c.aud = f.aud; c.u = Date.now();
            save(); done(true)
        };
        d.showModal(); q.focus(); q.setSelectionRange(q.value.length, q.value.length)
    })
}
