/* Settings: one simple choice up front (new cards per day); the rest is tucked under Advanced */
function setView(v) {
    var s = S();
    function num(id, label, min, max, help) { return '<label for="' + id + '">' + label + '</label><input type="number" id="' + id + '" min="' + min + '" max="' + max + '" value="' + s[id] + '"><p class="hint" style="margin:4px 0 0">' + help + '</p>' }
    v.innerHTML = '<div class="panel" id="acctpanel"></div><div class="panel"><h2>Daily pace</h2>' +
        num("newPerDay", "New cards per day", 0, 500, "How many brand-new cards you meet each day. Cards you already know come back on their own schedule, so this only sets how fast you add new material. 10 is a good start; lower it if reviews start to feel heavy. 0 pauses new cards.") +
        '<p class="hint" id="msg" role="status"></p></div>' +
        '<div class="panel"><h2>AI question writing</h2><div id="aiSet"></div></div>' +
        '<div class="panel"><details class="adv"><summary>Advanced options</summary>' +
        num("maxReviews", "Review limit per day", 0, 2000, "Stops a big backlog from becoming overwhelming. 0 means no limit.") +
        '<label for="learnSteps">Correct answers before a new card counts as learned</label><select id="learnSteps">' + [1, 2, 3, 4, 5].map(function (n) { return '<option' + (s.learnSteps === n ? " selected" : "") + '>' + n + '</option>' }).join("") + '</select><p class="hint" style="margin:4px 0 0">After you meet a new card, a quick quiz repeats it until you get it right this many times in a row. A miss starts the count over. 2 works well.</p>' +
        num("lessonBatch", "New cards per quick quiz", 1, 20, "How many new cards you meet before each quick quiz. 5 is a good size.") +
        '<div class="opts"><label><input type="checkbox" id="shuffle"' + (s.shuffle ? " checked" : "") + '> Shuffle the order of reviews (otherwise the oldest come first)</label></div>' +
        '<label for="dupScope">Duplicate check</label><select id="dupScope"><option value="deck"' + (s.dupScope === "deck" ? " selected" : "") + '>Compare with cards in the same deck</option><option value="all"' + (s.dupScope === "all" ? " selected" : "") + '>Compare with cards in every deck</option></select><p class="hint" style="margin:4px 0 0">Cards with the same prompt (and picture or audio) count as duplicates when you add cards.</p>' +
        '<div class="row"><button id="rw">Restore default home page</button><button id="rt">Reset today\'s counters</button></div></details></div>';
    [["newPerDay", 0, 500], ["maxReviews", 0, 2000], ["lessonBatch", 1, 20]].forEach(function (f) { $("#" + f[0]).onchange = function () { var n = Math.round(+this.value); if (isNaN(n)) n = DEFAULTS[f[0]]; n = Math.max(f[1], Math.min(f[2], n)); this.value = n; s[f[0]] = n; save(); shell(); say("Saved.") } });
    $("#learnSteps").onchange = function () { s.learnSteps = +this.value; save(); say("Saved.") };
    $("#shuffle").onchange = function () { s.shuffle = this.checked; save(); say("Saved.") };
    $("#dupScope").onchange = function () { s.dupScope = this.value; save(); say("Saved.") };
    acctPaint(); aiSettings($("#aiSet"));
    $("#rw").onclick = function () { DB.widgets = null; normWidgets(); save(); say("Home page restored to the default layout.") };
    $("#rt").onclick = function () { delete DB.log[today()]; save(); shell(); say("Today's counters were reset.") }
}
