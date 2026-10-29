/* Puter usage: how much of the monthly free allowance is left and what Recall used it for, with a link to the Puter dashboard.
   Source: puter.auth.getMonthlyUsage(). allowanceInfo is for the whole Puter account; the per-model list covers only this app and can lag about a minute.
   Puter measures resources in microcents ($0.01 = 1,000,000). */
var PU = { data: null, at: 0, err: "", busy: false };
var PUTER_DASH = "https://puter.com/dashboard#usage";
function puMoney(micro) { var d = micro / 1e8; return d >= 0.01 ? "$" + d.toFixed(2) : d > 0 ? "less than $0.01" : "$0.00" }
function puNice(name) { return String(name).replace(/[:_]+/g, " \u00b7 ").replace(/\s+/g, " ").trim() }
/* fetch (never opens a sign-in window); returns the data or null with PU.err set */
async function puterUsage(force) {
    if (PU.busy) return PU.data; if (!force && PU.data && Date.now() - PU.at < 30000) return PU.data; PU.busy = true; PU.err = "";
    try {
        var p = await aiLoadPuter(); if (!(await p.auth.isSignedIn())) { PU.err = "signin"; PU.data = null; return null }
        PU.data = await p.auth.getMonthlyUsage(); PU.at = Date.now(); return PU.data
    } catch (e) { PU.err = aiErr(e, "Couldn't read your usage."); return null } finally { PU.busy = false }
}
function puSummary(u) {
    var a = u.allowanceInfo || {}, allow = +a.monthUsageAllowance || 0, rem = Math.max(0, +a.remaining || 0), used = Math.max(0, allow - rem);
    var rows = Object.keys(u.usage || {}).map(function (k) { var x = u.usage[k] || {}; return { name: k, cost: +x.cost || 0, count: +x.count || 0, units: +x.units || 0 } }).filter(function (r) { return r.count || r.cost }).sort(function (x, y) { return y.cost - x.cost });
    var isAI = function (r) { return r.units > 0 && /completion|chat|ai|llm|model|gpt|claude|gemini|mistral|llama|deepseek|qwen|grok|openai|anthropic|image|speech/i.test(r.name) }, ai = rows.filter(isAI), other = rows.filter(function (r) { return !isAI(r) });
    return { ai: ai, aiCount: ai.reduce(function (s, r) { return s + r.count }, 0) / Math.max(1, ai.some(function (r) { return /input|output/.test(r.name) }) ? 2 : 1), aiCost: ai.reduce(function (s, r) { return s + r.cost }, 0), otherCount: other.reduce(function (s, r) { return s + r.count }, 0), allow: allow, rem: rem, used: used, usedPct: allow ? Math.min(100, Math.round(used / allow * 100)) : null, rows: rows, appCost: rows.reduce(function (s, r) { return s + r.cost }, 0), appCount: rows.reduce(function (s, r) { return s + r.count }, 0) }
}
function puBar(pct) { return '<div class="bar pubar" role="img" aria-label="' + pct + '% of the monthly allowance used"><i style="width:' + pct + '%;background:' + (pct >= 85 ? "var(--bad)" : pct >= 60 ? "var(--mid)" : "var(--ok)") + '"></i></div>' }
function puLink(text) { return '<a href="' + PUTER_DASH + '" target="_blank" rel="noopener">' + (text || "Open your Puter dashboard") + ' \u2197</a>' }
function puterUsageHTML() { return '<div class="pusage" id="pusage" aria-live="polite"></div>' }
function paintPuterUsage() {
    var el = document.getElementById("pusage"); if (!el) return; var u = PU.data, head = '<div class="pu-head"><h3>Puter usage this month</h3><span class="pu-actions"><button class="sm" id="pur" type="button"' + (PU.busy ? " disabled" : "") + '>' + (PU.busy ? "Checking\u2026" : "Refresh") + '</button>' + puLink("Puter dashboard") + '</span></div>';
    if (!u) {
        el.innerHTML = head + (PU.busy ? progHTML("pupg", "Reading your usage\u2026") : PU.err === "signin" ? '<p class="hint">Sign in to Puter (button above) to see how much of your free allowance is left.</p>' : PU.err ? '<p class="hint fl-err">' + esc(PU.err) + ' You can still check on your ' + puLink("Puter dashboard") + '.</p>' : '<p class="hint">Not loaded yet.</p>');
        if (PU.busy) progSet("pupg", null, "Reading your usage\u2026", true)
    } else {
        var s = puSummary(u), sa = s.allow ? s.usedPct + "% used \u00b7 " + puMoney(s.rem) + " left of " + puMoney(s.allow) : "";
        el.innerHTML = head + (s.allow ? puBar(s.usedPct) + '<p class="pu-line"><b>' + (100 - s.usedPct) + '% of your monthly Puter allowance is left.</b> <span class="hint">' + esc(sa) + '. This is for your whole Puter account.</span></p>' : '<p class="hint">Puter did not report an allowance for this account.</p>') +
            '<p class="pu-line">Recall has made about <b>' + Math.round(s.aiCount) + ' AI request' + (Math.round(s.aiCount) === 1 ? "" : "s") + '</b> this month, costing about <b>' + puMoney(s.aiCost) + '</b>' + (s.otherCount ? ', plus ' + s.otherCount + ' other Puter request' + (s.otherCount === 1 ? "" : "s") + ' (such as saving your cards)' : "") + '.</p>' +
            (s.rows.length ? '<div class="plan-wrap"><table class="plan pu-table"><thead><tr><th>Model or service</th><th>Requests</th><th>Size</th><th>Cost</th></tr></thead><tbody>' + s.rows.slice(0, 8).map(function (r) { return '<tr><td>' + esc(puNice(r.name)) + '</td><td>' + r.count + '</td><td>' + (r.units ? r.units.toLocaleString() : "\u2013") + '</td><td>' + puMoney(r.cost) + '</td></tr>' }).join("") + '</tbody></table></div>' + (s.rows.length > 8 ? '<p class="hint">Showing the 8 biggest of ' + s.rows.length + '.</p>' : "") : '<p class="hint">No requests yet this month.</p>') +
            '<p class="hint">Size is tokens for AI models. The list covers only Recall and can lag about a minute. ' + puLink("Full details on your Puter dashboard") + '.</p>'
    }
    var r = document.getElementById("pur"); if (r) r.onclick = function () { puterUsage(true).then(function () { paintPuterUsage(); paintPuterMini() }); paintPuterUsage() }
}
function puterMiniHTML() { return '<p class="hint pumini" id="pumini" aria-live="polite"></p>' }
function paintPuterMini() {
    var el = document.getElementById("pumini"); if (!el) return; var u = PU.data;
    if (!u) { el.innerHTML = PU.busy ? "Checking your Puter allowance\u2026" : PU.err === "signin" ? 'Puter allowance: sign in to see how much is left. ' + puLink("Puter dashboard") : PU.err ? "" : ""; return }
    var s = puSummary(u); el.innerHTML = s.allow ? 'Puter allowance: <b>' + (100 - s.usedPct) + '% left</b> this month (' + puMoney(s.rem) + '). <button class="linkbtn" id="pumr" type="button">Refresh</button> \u00b7 ' + puLink("Puter dashboard") : "";
    var b = document.getElementById("pumr"); if (b) b.onclick = function () { puterUsage(true).then(function () { paintPuterMini(); paintPuterUsage() }); el.textContent = "Checking\u2026" }
}
/* show what we know, then look it up (only when the Puter script is already around, so this never opens anything) */
function puterUsageInit() { paintPuterUsage(); paintPuterMini(); aiLoadPuter().then(function () { return puterUsage(false) }).then(function () { paintPuterUsage(); paintPuterMini() }).catch(function () { }) }
/* a minute after an AI request the per-model list has caught up */
function puterUsageAfterRun() { if (aiProvider() !== "puter") return; setTimeout(function () { puterUsage(true).then(function () { paintPuterUsage(); paintPuterMini() }) }, 2500) }
