/* Settings: daily limits, learning stage, duplicates, dashboard */
function setView(v) {
    var s = S();
    function num(id, label, min, max, help) { return '<label for="' + id + '">' + label + '</label><input type="number" id="' + id + '" min="' + min + '" max="' + max + '" value="' + s[id] + '"><p class="hint" style="margin:4px 0 0">' + help + '</p>' }
    v.innerHTML = '<div class="panel"><h2>Review settings</h2>' +
        num("newPerDay", "New cards per day", 0, 500, "How many new cards lessons introduce each day. 0 pauses new cards.") +
        num("maxReviews", "Maximum reviews per day", 0, 2000, "Caps daily reviews so a big backlog doesn't swamp you. 0 means no limit.") +
        '<label for="learnSteps">Learning stage: correct answers needed</label><select id="learnSteps">' + [1, 2, 3, 4, 5].map(function (n) { return '<option' + (s.learnSteps === n ? " selected" : "") + '>' + n + '</option>' }).join("") + '</select><p class="hint" style="margin:4px 0 0">A new card is taught in a lesson, then quizzed until you get it right this many times. A miss starts it over. Only then does it join your review schedule.</p>' +
        num("lessonBatch", "Lesson batch size", 1, 20, "How many new cards are taught before their quiz.") +
        '<div class="opts"><label><input type="checkbox" id="shuffle"' + (s.shuffle ? " checked" : "") + '> Shuffle review order (otherwise oldest due first)</label></div>' +
        '<label for="dupScope">Duplicate check</label><select id="dupScope"><option value="deck"' + (s.dupScope === "deck" ? " selected" : "") + '>Compare with cards in the same deck</option><option value="all"' + (s.dupScope === "all" ? " selected" : "") + '>Compare with cards in every deck</option></select><p class="hint" style="margin:4px 0 0">Cards with the same prompt (and picture or audio) count as duplicates when you create or import.</p><p class="hint" id="msg" role="status"></p></div>' +
        '<div class="panel"><h2>Dashboard and progress</h2><div class="row" style="margin:0"><button id="rw">Restore default widgets</button><button id="rt">Reset today\'s counters</button></div></div>';
    [["newPerDay", 0, 500], ["maxReviews", 0, 2000], ["lessonBatch", 1, 20]].forEach(function (f) { $("#" + f[0]).onchange = function () { var n = Math.round(+this.value); if (isNaN(n)) n = DEFAULTS[f[0]]; n = Math.max(f[1], Math.min(f[2], n)); this.value = n; s[f[0]] = n; save(); shell(); say("Saved.") } });
    $("#learnSteps").onchange = function () { s.learnSteps = +this.value; save(); say("Saved.") };
    $("#shuffle").onchange = function () { s.shuffle = this.checked; save(); say("Saved.") };
    $("#dupScope").onchange = function () { s.dupScope = this.value; save(); say("Saved.") };
    $("#rw").onclick = function () { DB.widgets = null; normWidgets(); save(); say("Dashboard widgets restored.") };
    $("#rt").onclick = function () { delete DB.log[today()]; save(); shell(); say("Today's counters were reset.") }
}
