/* Library: browse, search, filter, edit, delete (one or many, always confirmed), duplicate cleanup and all exports */
var LIB = { sel: {}, q: "", ft: "all", fs: "all" };
function stageKey(c) { return c.stage === "new" ? "new" : c.stage === "learning" ? "learning" : c.box >= 5 ? "mastered" : "reviewing" }
function libFiltered() {
    var q = LIB.q.toLowerCase().trim();
    return scoped().filter(function (c) {
        if (q && (qText(c) + " " + (c.a || "")).toLowerCase().indexOf(q) < 0) return false;
        if (LIB.ft !== "all" && kind(c) !== LIB.ft) return false;
        if (LIB.fs !== "all" && stageKey(c) !== LIB.fs) return false; return true
    })
}
/* changing the search or a filter drops hidden cards from the selection, so "Delete selected" can never remove cards you can't see */
function libPrune() { var ids = {}; libFiltered().forEach(function (c) { ids[c.id] = 1 }); Object.keys(LIB.sel).forEach(function (k) { if (!ids[k]) delete LIB.sel[k] }) }
function libItem(c) {
    return '<div class="item"><input type="checkbox" data-sel="' + c.id + '" aria-label="Select card"' + (LIB.sel[c.id] ? " checked" : "") + '>' + (c.img ? '<img alt="" src="' + c.img + '">' : "") + '<div class="body"><div>' + esc(c.q.replace(/\n/g, " ") || "(picture or audio)") + '</div><div class="a">' + esc((c.a || "").replace(/\n/g, " ")) + '</div><div class="chips"><span class="chip">' + kind(c) + ' \u00b7 ' + stageLabel(c) + '</span>' + (c.cx && c.cx.some(Boolean) ? '<span class="chip">explained</span>' : "") + '<span class="acts"><button class="sm" data-ed="' + c.id + '">Edit</button><button class="sm" data-del="' + c.id + '" aria-label="Delete card">\u00d7</button></span></div></div></div>'
}
function libPaint() {
    var list = libFiltered(), box = $("#liblist"); if (!box) return;
    box.innerHTML = list.length ? list.map(libItem).join("") : '<p class="hint">No cards match. Clear the search or change the filters.</p>';
    var all = scoped().length, n = Object.keys(LIB.sel).filter(function (k) { return LIB.sel[k] && DB.cards.some(function (c) { return c.id === k }) }).length;
    $("#libcount").textContent = "Showing " + list.length + " of " + all + " cards";
    $("#lselct").textContent = n ? n + " selected" : "None selected";
    var d = $("#ldel"); d.disabled = !n; d.textContent = n ? "Delete " + n + " selected" : "Delete selected"; libExplainBtn();
    var sa = $("#lall"), shown = list.filter(function (c) { return LIB.sel[c.id] }).length; sa.checked = list.length > 0 && shown === list.length; sa.indeterminate = shown > 0 && shown < list.length;
    box.querySelectorAll("[data-sel]").forEach(function (c) { c.onchange = function () { if (c.checked) LIB.sel[c.dataset.sel] = true; else delete LIB.sel[c.dataset.sel]; libPaintCounts() } });
    box.querySelectorAll("[data-ed]").forEach(function (b) { b.onclick = function () { var c = DB.cards.find(function (x) { return x.id === b.dataset.ed }); form = formFrom(c); tab = "add"; render() } });
    box.querySelectorAll("[data-del]").forEach(function (b) { b.onclick = function () { var c = DB.cards.find(function (x) { return x.id === b.dataset.del }); libDelete([c.id], 'Delete this card?', '"' + (c.q || "(picture or audio)").replace(/\n/g, " ").slice(0, 90) + '" and its study progress will be deleted. This can\'t be undone.') } })
}
function libExplainable() { return DB.cards.filter(function (c) { return LIB.sel[c.id] && aiNeedsExplain(c) }) }
function libExplainBtn() { var n = libExplainable().length, b = $("#lexp"); if (b) { b.disabled = !n; b.textContent = n ? "Add choice explanations (" + n + ")" : "Add choice explanations" } }
function libPaintCounts() {
    var list = libFiltered(), n = Object.keys(LIB.sel).filter(function (k) { return LIB.sel[k] && DB.cards.some(function (c) { return c.id === k }) }).length;
    $("#lselct").textContent = n ? n + " selected" : "None selected"; var d = $("#ldel"); d.disabled = !n; d.textContent = n ? "Delete " + n + " selected" : "Delete selected"; libExplainBtn();
    var sa = $("#lall"), shown = list.filter(function (c) { return LIB.sel[c.id] }).length; sa.checked = list.length > 0 && shown === list.length; sa.indeterminate = shown > 0 && shown < list.length
}
async function libDelete(ids, title, body) {
    if (!ids.length) return;
    if (!(await askConfirm({ title: title, body: body, ok: ids.length === 1 ? "Delete card" : "Delete " + ids.length + " cards", danger: true }))) return;
    markGone(ids); DB.cards = DB.cards.filter(function (c) { return ids.indexOf(c.id) < 0 }); ids.forEach(function (i) { delete LIB.sel[i] }); sess = null; save(); render(); toast("Deleted " + ids.length + (ids.length === 1 ? " card." : " cards."))
}
function libView(v) {
    var cs = scoped(), dups = dupGroups().length;
    v.innerHTML = '<div class="panel"><h2>Export ' + (DB.cur === "all" ? "all decks" : esc(deckName(DB.cur))) + '</h2><p class="hint">Recall JSON keeps pictures, audio and your progress. Anki and Quizlet files are plain text and carry card text only.</p><div class="row">' +
        [["json", "Recall JSON"], ["csv", "CSV"], ["anki", "Anki (.txt)"], ["quizlet", "Quizlet (.txt)"], ["md", "Markdown"], ["html", "Study sheet (HTML)"]].map(function (x) { return '<button data-e="' + x[0] + '">' + x[1] + '</button>' }).join("") + '</div><p class="hint" id="msg" role="status"></p></div>' +
        '<div class="panel"><div class="row lib-top"><h2 style="margin:0">Cards</h2><span class="hint" id="libcount" role="status"></span>' + (dups ? '<button class="sm" id="rd" type="button">Remove ' + dups + ' duplicate' + (dups > 1 ? "s" : "") + '</button>' : "") + '</div>' +
        '<div class="toolbar"><input type="search" id="sq" placeholder="Search cards" aria-label="Search cards" value="' + esc(LIB.q) + '">' +
        '<select id="lft" aria-label="Card type">' + [["all", "All types"], ["choice", "Multiple choice"], ["text", "Text"], ["fill-in", "Fill-in"], ["image", "Image"], ["audio", "Audio"]].map(function (t) { return '<option value="' + t[0] + '"' + (LIB.ft === t[0] ? " selected" : "") + '>' + t[1] + '</option>' }).join("") + '</select>' +
        '<select id="lfs" aria-label="Learning stage">' + [["all", "All stages"], ["new", "New"], ["learning", "Learning"], ["reviewing", "Reviewing"], ["mastered", "Mastered"]].map(function (t) { return '<option value="' + t[0] + '"' + (LIB.fs === t[0] ? " selected" : "") + '>' + t[1] + '</option>' }).join("") + '</select></div>' +
        '<div class="bulkbar"><label class="inl"><input type="checkbox" id="lall"> Select all shown</label><span class="hint" id="lselct"></span><span class="grow"></span><button class="sm" id="lclr" type="button">Clear selection</button><button class="sm" id="lexp" type="button" disabled>Add choice explanations</button><button class="sm danger" id="ldel" type="button" disabled>Delete selected</button></div>' + progHTML("libprog", "") + '<p class="hint fl-err" id="libmsg" role="status"></p>' +
        '<div id="liblist"></div>' + (DB.cur !== "all" ? '<div class="row"><button class="sm danger" id="dd" type="button">Delete this deck and its cards</button></div>' : "") + '</div>';
    libPaint();
    $("#sq").oninput = function () { LIB.q = this.value; libPrune(); libPaint() };
    $("#lft").onchange = function () { LIB.ft = this.value; libPrune(); libPaint() }; $("#lfs").onchange = function () { LIB.fs = this.value; libPrune(); libPaint() };
    $("#lall").onchange = function () { var on = this.checked; libFiltered().forEach(function (c) { if (on) LIB.sel[c.id] = true; else delete LIB.sel[c.id] }); libPaint() };
    $("#lclr").onclick = function () { LIB.sel = {}; libPaint() };
    $("#lexp").onclick = async function () {
        var cs = libExplainable(); if (!cs.length) return; var P = AI_PROV[aiProvider()], btn = this, msg = $("#libmsg"); msg.textContent = "";
        if (!(await askConfirm({ title: "Write explanations for " + cs.length + " card" + (cs.length === 1 ? "" : "s") + "?", body: "Each choice gets a one-sentence reason it is right or wrong, written with " + P.name + ". The questions and choices are not changed.", ok: "Write explanations" }))) return;
        btn.disabled = true; progSet("libprog", null, "Getting ready\u2026", true); var stopT = progTimer("libprog");
        try {
            var n = await aiExplainChoices(cs, { report: function (t, pct, busy) { progSet("libprog", pct == null ? null : pct, t, busy) } });
            stopT(); save(); progDone("libprog", "Added explanations to " + n + " of " + cs.length + " cards"); libPaint(); if (n < cs.length) msg.textContent = "The AI skipped " + (cs.length - n) + " card" + (cs.length - n === 1 ? "" : "s") + ". Select them and try again."
        } catch (e) { stopT(); progHide("libprog"); msg.textContent = e.message || "Something went wrong."; libExplainBtn() }
    };
    $("#ldel").onclick = function () { var ids = Object.keys(LIB.sel).filter(function (k) { return LIB.sel[k] && DB.cards.some(function (c) { return c.id === k }) }); libDelete(ids, "Delete " + ids.length + " card" + (ids.length === 1 ? "" : "s") + "?", "They and their study progress will be deleted. This can't be undone.") };
    if ($("#dd")) $("#dd").onclick = async function () {
        var id = DB.cur, n = DB.cards.filter(function (c) { return c.deck === id }).length;
        if (!(await askConfirm({ title: "Delete the deck \u201c" + deckName(id) + "\u201d?", body: "Its " + n + " cards and their study progress will be deleted. This can't be undone.", ok: "Delete deck", danger: true }))) return;
        markGone(DB.cards.filter(function (c) { return c.deck === id }).map(function (c) { return c.id }).concat([id])); DB.cards = DB.cards.filter(function (c) { return c.deck !== id }); DB.decks = DB.decks.filter(function (d) { return d.id !== id }); if (DB.plans && DB.plans[id]) DB.plans[id] = { on: false, due: 0, u: Date.now() }; DB.cur = "all"; LIB.sel = {}; sess = null; save(); render(); toast("Deck deleted.")
    };
    if ($("#rd")) $("#rd").onclick = async function () {
        var rm = dupGroups().map(function (c) { return c.id });
        if (!(await askConfirm({ title: "Remove " + rm.length + " duplicate" + (rm.length > 1 ? "s" : "") + "?", body: "The first copy of each card is kept. The extra copies and their progress are deleted.", ok: "Remove duplicates", danger: true }))) return;
        markGone(rm); DB.cards = DB.cards.filter(function (c) { return rm.indexOf(c.id) < 0 }); sess = null; save(); render(); toast("Removed " + rm.length + " duplicates. The first copy of each card was kept.")
    };
    v.querySelectorAll("[data-e]").forEach(function (b) { b.onclick = function () { exportAs(b.dataset.e) } })
}
function tsvf(s) { return String(s).replace(/\t/g, " ") }
function csvf(s) { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
function exportAs(k) {
    var cs = scoped(), nm = (DB.cur === "all" ? "recall-all" : "recall-" + deckName(DB.cur).replace(/[^\w-]+/g, "-")), f, data;
    if (!cs.length) { say("There are no cards to export."); return }
    if (k === "json") { f = nm + ".json"; data = JSON.stringify({ format: "recall", version: 3, decks: DB.decks.filter(function (d) { return DB.cur === "all" || d.id === DB.cur }), cards: cs }, null, 1) }
    else if (k === "csv") { f = nm + ".csv"; data = "Front,Back,Deck,Type\n" + cs.map(function (c) { return [qText(c), c.a, deckName(c.deck), kind(c)].map(csvf).join(",") }).join("\n") }
    else if (k === "anki") { f = nm + "-anki.txt"; var h = function (s) { return esc(s).replace(/&quot;/g, '"').replace(/\n/g, "<br>") }; data = "#separator:tab\n#html:true\n" + cs.map(function (c) { return tsvf(h(qText(c))) + "\t" + tsvf(h(c.a)) }).join("\n") }
    else if (k === "quizlet") { f = nm + "-quizlet.txt"; data = cs.map(function (c) { var p = kind(c) === "fill-in" ? clozePlain(c.q) : { p: qText(c), a: c.a }; var a = kind(c) === "fill-in" ? (p.a + (c.a ? " (" + c.a + ")" : "")) : p.a; return tsvf(p.p.replace(/\n/g, " / ")) + "\t" + tsvf(String(a).replace(/\n/g, " / ")) }).join("\n") }
    else if (k === "md") { f = nm + ".md"; data = "# " + (DB.cur === "all" ? "Recall cards" : deckName(DB.cur)) + "\n\n" + cs.map(function (c) { return qText(c).replace(/\n/g, " ") + " :: " + (c.a || "").replace(/\n/g, " ") }).join("\n") + "\n" }
    else { f = nm + "-study-sheet.html"; data = '<!DOCTYPE html><html lang="en"><meta charset="utf-8"><title>Study sheet</title><style>body{font:16px/1.5 Georgia,serif;max-width:760px;margin:24px auto;padding:0 16px}table{width:100%;border-collapse:collapse}td{border-top:1px solid #bbb;padding:8px;vertical-align:top;white-space:pre-wrap}img{max-width:200px}mark{background:#ffe68a}@media print{td{break-inside:avoid}}</style><h1>' + esc(DB.cur === "all" ? "Study sheet" : deckName(DB.cur)) + '</h1><table>' + cs.map(function (c) { return "<tr><td>" + media({ img: c.img, aud: "" }) + (kind(c) === "fill-in" ? clozeHTML(c.q, false) : esc(qText(c))) + (c.aud ? "<br><em>(audio card)</em>" : "") + "</td><td>" + back(c) + "</td></tr>" }).join("") + "</table></html>" }
    saveFile(f, data).then(function () { say("Saved " + f) }).catch(function (e) { if (e && e.code !== "declined") say("Couldn't save the file: " + ((e && e.message) || e.code)) })
}
