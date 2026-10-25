/* Vocabulary mode: paste or load a list of terms, say how you want the definitions written, and the AI builds the cards. */
var VOC_FMT = [
    ["td", "Term \u2192 definition", "The front shows the word; the back shows its meaning."],
    ["dt", "Definition \u2192 term", "The front shows the meaning; you recall the word."],
    ["both", "Both directions", "Two cards per term: word to meaning, and meaning to word."],
    ["cloze", "Fill in the blank", "An example sentence with the word hidden, so you learn it in context."],
    ["mc", "Multiple choice", "Pick the right definition. The AI writes believable wrong ones and explains each choice."]
];
var VOC_CHIPS = ["Use simple words (about 6th grade)", "Keep each definition under 15 words", "Add a memory tip or analogy", "Include the word's root or origin", "Mention a common mistake or confusion", "Write the definition in Spanish as well"];
function vocState() {
    if (!imp.voc) { var s = S().vocab || {}; imp.voc = { text: "", fmt: s.fmt || "td", ctx: s.ctx || "", instr: s.instr || "", ex: s.ex !== false, missing: [], msg: "" } }
    return imp.voc
}
/* one term per line ("term :: your own definition" is allowed); a single line may list terms separated by commas or semicolons */
function vocParse(text) {
    var lines = String(text || "").split(/\r?\n/).map(function (l) { return l.trim() }).filter(Boolean), out = [], seen = {};
    if (lines.length === 1 && /[,;]/.test(lines[0]) && !/::|\t/.test(lines[0])) lines = lines[0].split(/[,;]/).map(function (l) { return l.trim() }).filter(Boolean);
    lines.forEach(function (l) {
        l = l.replace(/^(\d+[.)]\s+|[-*\u2022]\s+)/, "").replace(/^["\u201c]|["\u201d]$/g, "");
        var m = l.split(/\s*::\s*|\t|\s\|\s/), term = (m[0] || "").trim(), def = (m.slice(1).join(" ") || "").trim();
        if (!term || term.length > 80) return; var k = term.toLowerCase(); if (seen[k]) return; seen[k] = 1; out.push({ term: term, def: def })
    });
    return out
}
function vocSystem(st, json) {
    var lines = [
        "You write vocabulary flashcard content for students. You are given a list of terms" + (st.ctx ? " from this subject or context: " + st.ctx : "") + ". For every term write an accurate definition for that subject or context (choose the meaning that fits it), and one natural example sentence that uses the term exactly as written, in the same form (do not change the ending or the capitalization of the term inside the sentence).",
        "Rules:",
        "- Plain text only, no markdown. Do not start the definition with the term itself or 'It is'.",
        "- If a term comes with a definition from the teacher (\"given\"), keep its meaning and use it as the definition; you may tidy the wording but must not contradict it.",
        "- If you do not know a term, give your best definition and add the word 'check' in \"note\". Never leave a definition empty.",
        "- Keep to the order of the list and return every term exactly once."
    ];
    if (st.instr.trim()) lines.push("", "HOW THE USER WANTS THE DEFINITIONS WRITTEN (follow this carefully):", st.instr.trim());
    if (st.fmt === "mc") lines.push("", "For multiple-choice cards also write \"wrong\": exactly three believable but WRONG definitions for the term (similar in length and style to the right one, based on real confusions with related words), each with a one-sentence \"why\" that explains what the wrong definition actually describes or why it does not fit. Also write \"why_correct\": one sentence on why the real definition is right.");
    lines.push("");
    var shape = '{"term": "the term", "definition": "...", "example": "..."' + (st.fmt === "mc" ? ', "why_correct": "...", "wrong": [{"c": "wrong definition", "why": "..."}, {"c": "...", "why": "..."}, {"c": "...", "why": "..."}]' : "") + ', "note": ""}';
    lines.push(json ? "Output format: a single JSON object {\"items\": [ one of these for every term ]} where each item looks like:" : "Output format: one JSON object per line and nothing else (no code fences, no commentary, no line breaks inside a value), one line per term, like this:");
    lines.push(shape); return lines.join("\n")
}
async function vocGenerate(terms, st, o) {
    var pk = aiProvider(), P = AI_PROV[pk], per = pk === "chrome" ? 5 : 15, batches = [], res = [], done = 0, failed = null, report = o.report || function () { };
    for (var i = 0; i < terms.length; i += per) batches.push(terms.slice(i, i + per));
    o.schema = { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" }, example: { type: "string" }, why_correct: { type: "string" }, wrong: { type: "array", items: { type: "object", properties: { c: { type: "string" }, why: { type: "string" } } } }, note: { type: "string" } }, required: ["term", "definition"] } } }, required: ["items"] };
    o.status = o.status || function (t, pct) { if (typeof pct === "number" || /sign-in|download|loading/i.test(t || "")) report(t, pct, true) };
    var sys = vocSystem(st, pk === "chrome");
    for (var b = 0; b < batches.length; b++) {
        if (o.cancelled && o.cancelled()) break;
        report("Writing definitions (request " + (b + 1) + " of " + batches.length + ") \u00b7 " + res.length + " of " + terms.length + " terms done", b / batches.length * 100, true);
        var user = "TERMS (" + batches[b].length + "):\n" + batches[b].map(function (t, k) { return (k + 1) + ". " + t.term + (t.def ? "   [given: " + t.def + "]" : "") }).join("\n") + "\n\nWrite the cards now, one item per term.";
        try { var text = await P.call(sys, user, o) } catch (e) { if (res.length) { failed = e; break } throw e }
        aiJsonList(text).forEach(function (r) { if (r && r.term && r.definition) res.push(r) }); done++
    }
    o.warning = failed ? failed.message : ""; return res
}
function vocBuild(entries, terms, st) {
    var byTerm = {}; terms.forEach(function (t) { byTerm[t.term.toLowerCase()] = t });
    var cards = [], got = {}, ex = st.ex, esc2 = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") };
    entries.forEach(function (r) {
        var key = String(r.term).trim().toLowerCase(), t = byTerm[key]; if (!t || got[key]) return; got[key] = 1;
        var term = t.term, def = (t.def || String(r.definition || "")).trim(), eg = String(r.example || "").trim(), note = String(r.note || "").trim(); if (!def) return;
        var back = function (x) { return x + (ex && eg ? "\nExample: " + eg : "") }, base = { ai: true, file: "Vocabulary", note: note ? "The AI wasn't sure about this term. " : "", src: term };
        function add(c) { Object.keys(base).forEach(function (k) { if (c[k] === undefined) c[k] = base[k] }); cards.push(c) }
        var fmt = st.fmt;
        if (fmt === "cloze") {
            var m = eg && new RegExp(esc2(term), "i").exec(eg);
            if (m) { add({ q: eg.slice(0, m.index) + "{{c1::" + m[0] + "}}" + eg.slice(m.index + m[0].length), a: def }); return } fmt = "td"
        }
        if (fmt === "mc") {
            var wr = (Array.isArray(r.wrong) ? r.wrong : []).map(function (x) { return typeof x === "object" && x ? { t: String(x.c || x.text || "").trim(), why: String(x.why || "").trim() } : { t: String(x).trim(), why: "" } }).filter(function (x) { return x.t && x.t.toLowerCase() !== def.toLowerCase() }).slice(0, 3);
            if (wr.length >= 2) {
                var opts = shuffle(wr.concat([{ t: def, why: String(r.why_correct || "").trim(), ok: true }]));
                add({ q: "What does \u201c" + term + "\u201d mean?", a: back(def), ch: opts.map(function (x) { return x.t }), ci: opts.findIndex(function (x) { return x.ok }), cx: opts.some(function (x) { return x.why }) ? opts.map(function (x) { return x.why }) : undefined }); return
            }
            fmt = "td"
        }
        if (fmt === "dt" || fmt === "both") add({ q: def, a: back(term) });
        if (fmt === "td" || fmt === "both") add({ q: term, a: back(def) })
    });
    var missing = terms.filter(function (t) { return !got[t.term.toLowerCase()] });
    return { cards: cards, missing: missing }
}
function vocCount() {
    var st = vocState(), n = vocParse(st.text), c = $("#vcount"); if (!c) return n;
    c.textContent = n.length ? n.length + " term" + (n.length === 1 ? "" : "s") + " found" + (n.length > 150 ? ". Only the first 150 are used each time." : "") : "No terms yet";
    return n
}
function vocabView(v) {
    var st = vocState(), P = AI_PROV[aiProvider()]; imp.method = "vocab"; rebuild();
    var fm = VOC_FMT.find(function (f) { return f[0] === st.fmt }) || VOC_FMT[0];
    v.innerHTML = addSeg("vocab") +
        '<div class="panel"><h2>1. Your vocabulary list</h2><p class="hint" style="margin-top:0">One term per line, or a single line of terms separated by commas. To use your own definition, write <b>term :: definition</b> and the AI will keep it.</p>' +
        '<textarea id="vt" rows="8" aria-label="Vocabulary terms" placeholder="mitochondria\nglycolysis\nelectron transport chain\nNAD+ :: a coenzyme that carries electrons">' + esc(st.text) + '</textarea>' +
        '<div class="row"><label class="filebtn">Load a list from a file<input type="file" id="vf" accept=".txt,.csv,.tsv,.md"></label><span class="hint" id="vcount" role="status"></span></div></div>' +
        '<div class="panel"><h2>2. How should the cards be written?</h2>' +
        '<label for="vctx">Subject or context (optional)</label><input type="text" id="vctx" placeholder="e.g. AP Biology, cellular respiration" value="' + esc(st.ctx) + '"><p class="hint" style="margin:4px 0 0">Helps the AI pick the right meaning of words that have several.</p>' +
        '<label for="vins">Your instructions for the AI (optional)</label><div class="chips-row" role="group" aria-label="Instruction ideas">' + VOC_CHIPS.map(function (c, i) { return '<button type="button" class="chipbtn' + (st.instr.indexOf(c) > -1 ? " on" : "") + '" data-chip="' + i + '" aria-pressed="' + (st.instr.indexOf(c) > -1) + '">' + esc(c) + '</button>' }).join("") + '</div>' +
        '<textarea id="vins" rows="3" placeholder="e.g. Write for 7th graders. One short sentence each. Add a memory tip.">' + esc(st.instr) + '</textarea>' +
        '<label for="vfmt">Card format</label><select id="vfmt">' + VOC_FMT.map(function (f) { return '<option value="' + f[0] + '"' + (st.fmt === f[0] ? " selected" : "") + '>' + f[1] + '</option>' }).join("") + '</select><p class="hint" id="vfmtn" style="margin:4px 0 0">' + fm[2] + '</p>' +
        '<div class="opts"><label><input type="checkbox" id="vex"' + (st.ex ? " checked" : "") + '> Show the example sentence on the back of the card</label></div>' +
        '<p class="hint">AI provider: ' + esc(P.short.replace("The slide text", "Your list of terms")) + '. <button class="sm" id="vchg" type="button">Change in Settings</button></p>' +
        '<div class="row"><button class="primary" id="vgo" type="button">' + ((imp.vocab || []).length ? "Write a new set" : "Write the cards") + '</button><button id="vstop" type="button" hidden>Stop</button></div>' + progHTML("vprog", "") +
        '<p class="hint" id="vmsg" role="status">' + esc(st.msg) + '</p><div id="vmiss"></div></div><div id="istep3"></div>';
    function missing() {
        var m = $("#vmiss"); if (!m) return;
        m.innerHTML = st.missing.length ? '<p class="fl-last mc-fb bad">' + st.missing.length + ' term' + (st.missing.length === 1 ? " was" : "s were") + ' left out: ' + esc(st.missing.slice(0, 8).map(function (t) { return t.term }).join(", ")) + (st.missing.length > 8 ? ", and more" : "") + '. <button class="sm" id="vretry" type="button">Try these again</button></p>' : "";
        var r = $("#vretry"); if (r) r.onclick = function () { run(st.missing, true) }
    }
    var t = $("#vt"); t.oninput = function () { st.text = t.value; vocCount() };
    $("#vf").onchange = async function () { var f = this.files[0]; this.value = ""; if (!f) return; st.text = (st.text ? st.text.replace(/\s+$/, "") + "\n" : "") + (await f.text()).replace(/\r/g, ""); t.value = st.text; if (!imp.deck) imp.deck = "Vocabulary"; vocCount() };
    $("#vctx").oninput = function () { st.ctx = this.value };
    var ins = $("#vins"); ins.oninput = function () { st.instr = ins.value; chips() };
    function chips() { v.querySelectorAll("[data-chip]").forEach(function (b) { var on = st.instr.indexOf(VOC_CHIPS[+b.dataset.chip]) > -1; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on) }) }
    v.querySelectorAll("[data-chip]").forEach(function (b) { b.onclick = function () { var c = VOC_CHIPS[+b.dataset.chip]; if (st.instr.indexOf(c) > -1) st.instr = st.instr.replace(c, "").replace(/\n{2,}/g, "\n").replace(/^\n|\n$/g, ""); else st.instr = (st.instr.trim() ? st.instr.trim() + "\n" : "") + c; ins.value = st.instr; chips() } });
    $("#vfmt").onchange = function () { st.fmt = this.value; $("#vfmtn").textContent = (VOC_FMT.find(function (f) { return f[0] === st.fmt }) || VOC_FMT[0])[2] };
    $("#vex").onchange = function () { st.ex = this.checked };
    $("#vchg").onclick = function () { tab = "set"; render() };
    var stopB = $("#vstop"), goB = $("#vgo");
    stopB.onclick = function () { imp.vocCancel = true; stopB.disabled = true; progSet("vprog", imp.vocPct, "Stopping after the current request\u2026", true) };
    async function run(list, retry) {
        if (imp.vocRunning) return; var terms = (list || vocParse(st.text)).slice(0, 150), msg = $("#vmsg");
        if (!terms.length) { msg.className = "hint fl-err"; msg.textContent = "Add some terms first."; return }
        if (!retry && (imp.vocab || []).length && !(await askConfirm({ title: "Replace the cards you have?", body: "Writing a new set discards the " + imp.vocab.length + " cards below. Nothing has been added to your decks yet.", ok: "Write a new set", danger: true }))) return;
        S().vocab = { fmt: st.fmt, ctx: st.ctx, instr: st.instr, ex: st.ex }; save(); imp.vocRunning = true; imp.vocCancel = false; imp.vocPct = null; msg.className = "hint"; msg.textContent = ""; st.msg = ""; goB.disabled = true; stopB.hidden = false; stopB.disabled = false;
        function rep(l, p, bz) { if (p !== undefined) imp.vocPct = p; progSet("vprog", imp.vocPct, l, bz) } rep("Getting ready\u2026", null, true); var stopT = progTimer("vprog"), o = { report: rep, cancelled: function () { return imp.vocCancel } };
        try {
            var entries = await vocGenerate(terms, st, o); stopT(); imp.vocRunning = false; var b = vocBuild(entries, terms, st);
            if (!b.cards.length) { progHide("vprog"); msg.className = "hint fl-err"; msg.textContent = imp.vocCancel ? "Stopped before any cards were written." : "The AI didn't return usable definitions. Try again."; goB.disabled = false; stopB.hidden = true; return }
            imp.vocab = retry ? (imp.vocab || []).concat(b.cards) : b.cards; st.missing = b.missing; if (!imp.deck) imp.deck = "Vocabulary"; rebuild();
            progDone("vprog", (imp.vocCancel ? "Stopped. Kept " : retry ? "Added " : "Wrote ") + b.cards.length + (retry ? " more " : " ") + (b.cards.length === 1 ? "card" : "cards") + ". Review them below."); st.msg = o.warning ? "Some requests failed (" + o.warning + "), so some terms are missing." : "";
            msg.textContent = st.msg; msg.className = o.warning ? "hint fl-err" : "hint"; goB.disabled = false; goB.textContent = "Write a new set"; stopB.hidden = true; missing(); step3(v);
            var s3 = $("#istep3"); if (s3 && s3.scrollIntoView) s3.scrollIntoView({ behavior: "smooth", block: "start" })
        } catch (e) { stopT(); imp.vocRunning = false; progHide("vprog"); msg.className = "hint fl-err"; msg.textContent = e.message || "Something went wrong."; st.msg = msg.textContent; goB.disabled = false; stopB.hidden = true }
    }
    goB.onclick = function () { run() };
    if (imp.vocRunning) { goB.disabled = true; stopB.hidden = false; progSet("vprog", imp.vocPct, "Working\u2026", true) }
    if (aiProvider() === "puter") aiLoadPuter().catch(function () { });
    wireSeg(v); vocCount(); missing(); step3(v)
}
