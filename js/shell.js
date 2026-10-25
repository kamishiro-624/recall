/* App shell: deck selector, tabs, router */
function shell() {
    if (typeof cramRefresh === "function") cramRefresh();
    var s = $("#deck"); s.innerHTML = '<option value="all">All decks (' + DB.cards.length + ')</option>' + DB.decks.map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + ' (' + DB.cards.filter(function (c) { return c.deck === d.id }).length + ')</option>' }).join("");
    s.value = DB.cur;
    var due = reviewDue().length + lessonCount(), on = { dash: "dash", study: "dash", practice: "dash", cram: "dash", add: "import", vocab: "import", import: "import", lib: "lib", set: "set" }[tab];
    var t = [["dash", "Today" + (due ? " (" + due + ")" : "")], ["import", "Add cards"], ["lib", "Library"], ["set", "Settings"]];
    $("#nav").innerHTML = t.map(function (x) { return '<button data-t="' + x[0] + '" class="' + (on === x[0] ? "on" : "") + '"' + (on === x[0] ? ' aria-current="page"' : "") + '>' + x[1] + '</button>' }).join("");
    document.querySelectorAll("#nav button").forEach(function (b) { b.onclick = function () { tab = b.dataset.t; render() } })
}
$("#deck").onchange = function () { DB.cur = this.value; save(); sess = null; render() };
function render() { shell(); var v = $("#view"); v.className = tab === "dash" ? "" : "wrap"; ({ dash: dashView, study: studyView, add: addView, import: importView, lib: libView, set: setView, practice: practiceView, cram: cramView, vocab: vocabView })[tab](v) }
/* Add cards has two ways in; this switch sits at the top of both screens */
function addSeg(cur) { return '<div class="seg" role="group" aria-label="How to add cards">' + [["import", "From a file or notes"], ["vocab", "Vocabulary list"], ["add", "Write a card"]].map(function (x) { return '<button type="button" data-seg="' + x[0] + '" class="' + (cur === x[0] ? "on" : "") + '">' + x[1] + '</button>' }).join("") + '</div>' }
function wireSeg(v) { v.querySelectorAll("[data-seg]").forEach(function (b) { b.onclick = function () { if (tab !== b.dataset.seg) { tab = b.dataset.seg; render() } } }) }
