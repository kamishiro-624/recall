/* AI-written questions. Four providers, chosen in Settings:
   puter = Puter.js (free Puter account, nothing to install, no key), chrome = Chrome's built-in on-device model (no key), gemini = Google Gemini API (free key), claude = Anthropic API (key; no key needed inside Claude).
   Slide/document text is the only thing ever sent, and only to the provider you pick (nothing is sent for chrome). */
var AI_FORMS = {
  mc: "{\"type\": \"mc\", \"q\": \"question\", \"correct\": \"the correct choice\", \"wrong\": [\"wrong choice\", \"wrong choice\", \"wrong choice\"], \"a\": \"1-2 sentence explanation of why the correct choice is right\", \"src\": \"title of the main slide or section\", \"note\": \"\"}",
  short: "{\"type\": \"short\", \"q\": \"question\", \"a\": \"the answer: one word or a short phrase\", \"alt\": [\"other accepted wording\"], \"src\": \"title of the main slide or section\", \"note\": \"\"}",
  explain: "{\"type\": \"explain\", \"q\": \"question\", \"a\": \"model answer\", \"src\": \"title of the main slide or section\", \"note\": \"\"}",
  cloze: "{\"type\": \"cloze\", \"q\": \"a sentence with {{c1::hidden words}}\", \"a\": \"\", \"src\": \"title of the main slide or section\", \"note\": \"\"}"
};
var AI_STYLES = {
  mc: { label: "Mostly multiple choice (recommended)", types: ["mc", "short"], mix: "Make about four out of five cards multiple choice (type \"mc\") and the rest short answer (type \"short\")." },
  mix: { label: "Half multiple choice, half short answer", types: ["mc", "short", "cloze"], mix: "Make about half of the cards multiple choice (type \"mc\") and half short answer (type \"short\"), with an occasional fill-in-the-blank (type \"cloze\")." },
  short: { label: "Short answers (a word or phrase)", types: ["short", "cloze"], mix: "Make every card a short-answer card (type \"short\"), with an occasional fill-in-the-blank (type \"cloze\")." },
  explain: { label: "Written explanations (longer answers)", types: ["explain", "cloze"], mix: "Make every card a written-explanation card (type \"explain\"): the answer is a model answer of 1 to 3 sentences. At most one card in five may be a fill-in-the-blank (type \"cloze\")." }
};
function aiSystem(json, style) {
  var st = AI_STYLES[style] || AI_STYLES.mc, lines = [
    "You write study cards for a classroom spaced-repetition app. You are given the text of a teacher's slides or notes (titles, bullets, speaker notes). The slides are only SOURCE MATERIAL: turn the ideas behind them into questions that make students think, so that learning the cards means understanding the topic, not memorizing the slides.",
    "",
    "Write questions that:",
    "- ask WHY or HOW something happens (mechanisms, cause and effect)",
    "- compare and contrast related ideas",
    "- connect two ideas or stages and show how one depends on the other",
    "- predict what happens if a condition changes, or explain an unexpected result",
    "- apply the idea to a new, concrete scenario the slides did not mention",
    "- interpret an experiment or graph described in words",
    "",
    "Card types. " + st.mix
  ];
  if (st.types.indexOf("mc") > -1) lines.push("- mc (multiple choice): one question, one correct choice and exactly three wrong choices. The wrong choices must be plausible: base them on real misconceptions or on ideas that are true but answer a different question. Keep all four choices similar in length and style, never make the correct one the longest, and never use \"all of the above\", \"none of the above\" or \"both A and B\". Choices are short (under 12 words). The question must be answerable without seeing the choices. Do not give away the answer in the wording of the question. Put the explanation in \"a\".");
  if (st.types.indexOf("short") > -1) lines.push("- short (short answer): the answer is ONE word or a short phrase of at most five words, and the question must have one clear answer (list other accepted wordings in \"alt\"). Ask for a term, a name, a quantity, a direction (increase or decrease) or a cause, not a description.");
  if (st.types.indexOf("explain") > -1) lines.push("- explain: the answer is a short model answer (1 to 3 sentences) that includes the reasoning.");
  if (st.types.indexOf("cloze") > -1) lines.push("- cloze (fill-in-the-blank): a complete sentence with the key term wrapped like {{c1::hidden words}}, with enough context to be answerable.");
  lines = lines.concat([
    "",
    "Rules:",
    "- Every card must make sense on its own. Never mention 'the slide', 'the presentation' or slide order. Put any context the student needs into the question.",
    "- Do not simply turn a bullet into a question. If the answer could be copied word for word from one slide line, rewrite the question so it needs reasoning.",
    "- Be accurate. If the slides contain a mistake or an oversimplification, write the correct version and put a short teacher note in \"note\" (for example: Slide says X; the accurate statement is Y). Otherwise leave note empty.",
    "- Cover the whole range of the material. Never repeat or rephrase a question that was already written.",
    "- Pitch the wording to the level in the teacher's guidance. If there is none, assume a high-school class.",
    "- Plain text only, no markdown.",
    ""
  ]);
  var forms = st.types.map(function (t) { return AI_FORMS[t] });
  lines.push(json ? "Output format: a single JSON object {\"cards\": [ ... ]} where each card is one of these shapes:" : "Output format: one JSON object per line and nothing else (no code fences, no commentary, no line breaks inside a value), each in one of these shapes:");
  return lines.concat(forms).join("\n")
}
var AI_GEM_LIST = [];
var AI_PROV = {
  puter: {
    name: "Puter (free account, nothing to install)", short: "Puter. The slide text is sent to Puter and the AI company behind the model", chunk: 30000, batch: 10, prior: 80, call: aiPuterCall,
    notes: [["Cost", "Free. Each person signs in with their own free Puter account, and their usage comes out of that account's free monthly allowance. When it runs out, Puter asks to upgrade, so the limits can change."], ["Privacy", "Slide text goes to Puter and the AI company behind the model. Students use their own accounts, so check your school's rules on student accounts."], ["Needs", "Nothing to install and no key. A sign-in window opens the first time (allow pop-ups). Some school networks block Puter."], ["Quality", "Generally strong, but it depends on the model Puter uses by default."]]
  },
  chrome: {
    name: "Chrome built-in AI (on this device)", short: "Chrome's built-in AI. It runs on this device and nothing is sent anywhere", chunk: 5000, batch: 5, prior: 25, call: aiChromeCall,
    notes: [["Cost", "Free. No account or key."], ["Privacy", "Runs on this device. Slide text never leaves it."], ["Needs", "Desktop Chrome with two flags switched on (Settings shows the steps if it's off), a computer that meets Google's requirements, and a one-time download of the model (several GB). For web pages this is still experimental, so it won't work on a stock Chrome, phones, other browsers, inside embedded pages, or on many school Chromebooks."], ["Quality", "A small model, so expect simpler questions and review every card. It writes a few at a time, so large sets are slow. Works best for English text."]]
  },
  gemini: {
    name: "Google Gemini (free key)", short: "Google Gemini. The slide text is sent to Google", chunk: 30000, batch: 10, prior: 80, call: aiGeminiCall,
    notes: [["Cost", "Free with a Google AI Studio key (no billing needed). The free limits are low, but enough to write a deck's questions."], ["Privacy", "Slide text is sent to Google. Free-tier content may be used to improve Google's products under its terms, so don't include student information."], ["Needs", "A key from aistudio.google.com/app/apikey. It stays in this browser only."], ["Quality", "Strong. The best free choice for why/how/predict questions."]]
  },
  claude: {
    name: "Claude (Anthropic API key)", short: "Claude. The slide text is sent to Anthropic", chunk: 30000, batch: 10, prior: 80, call: aiClaudeCall,
    notes: [["Cost", "An Anthropic API key, billed by use (a few cents for a deck). No key is needed when Recall is running inside Claude."], ["Privacy", "Slide text is sent to Anthropic."], ["Needs", "A key from console.anthropic.com. It stays in this browser only."], ["Quality", "Strong."]]
  }
};
function aiProvider() { var p = S().aiProvider; return AI_PROV[p] ? p : "puter" }
/* prompt building and parsing */
function aiPiece(s) {
  return "## " + s.title + "\n" + s.body.map(function (b) { return "- " + b.replace(/\s*\n\s*/g, " ") }).join("\n") + (s.notes ? "\nSpeaker notes: " + s.notes : "") + (!s.body.length && !s.notes && s.imgs.length ? "\n(picture only)" : "")
}
function aiChunks(secs, max) {
  var chunks = [], cur = null;
  secs.forEach(function (s) { var p = aiPiece(s).slice(0, max); if (!cur || cur.len + p.length > max) { cur = { text: "", len: 0 }; chunks.push(cur) } cur.text += (cur.text ? "\n\n" : "") + p; cur.len += p.length });
  return chunks
}
function aiParse(text) {
  text = String(text).replace(/```(?:json)?/gi, "").trim();
  var list = [], j = null; try { j = JSON.parse(text) } catch (e) { }
  if (j) list = Array.isArray(j) ? j : Array.isArray(j.cards) ? j.cards : [j];
  else text.split(/\r?\n/).forEach(function (l) { l = l.trim().replace(/,$/, ""); if (l.charAt(0) !== "{") return; try { list.push(JSON.parse(l)) } catch (e) { } });
  var out = [];
  list.forEach(function (o) {
    if (!o) return; var q = String(o.q || "").trim(), a = String(o.a || "").trim(), type = String(o.type || "").toLowerCase();
    if (!q) return;
    var card = { q: q, a: a, src: String(o.src || ""), note: String(o.note || "").trim(), ai: true };
    var cor = String(o.correct || "").trim(), wr = Array.isArray(o.wrong) ? o.wrong : (Array.isArray(o.choices) ? o.choices : []);
    if (Array.isArray(o.choices) && /^[A-Da-d]$/.test(cor)) cor = String(o.choices["ABCD".indexOf(cor.toUpperCase())] || "").trim();
    if (type === "mc" || (cor && wr.length)) {
      var seen = {}; seen[cor.toLowerCase()] = 1;
      wr = wr.map(function (x) { return String(x).trim() }).filter(function (x) { if (!x || seen[x.toLowerCase()]) return false; seen[x.toLowerCase()] = 1; return true }).slice(0, 4);
      if (!cor || wr.length < 2) return;
      var opts = shuffle([cor].concat(wr)); card.ch = opts; card.ci = opts.indexOf(cor); card.a = cor + (a ? "\n" + a : "")
    } else {
      if (!a && !/\{\{c\d+::/.test(q)) return;
      if (Array.isArray(o.alt) && o.alt.length) card.alt = o.alt.map(String).map(function (x) { return x.trim() }).filter(Boolean).slice(0, 5)
    }
    out.push(card)
  });
  return out
}
function aiUser(outline, n, prior, o, P, job) {
  var head = job && job.kind === "bridge"
    ? "These are SEPARATE lessons. Write cards that CONNECT them: compare and contrast ideas, show how what one lesson produces is what another needs, or ask students to predict how a change in one process affects the other. Every card must need ideas from at least TWO of the lessons, and \"src\" should name the lessons involved.\n\n" + outline
    : "LESSON: " + (job ? job.label : "") + "\n\nMATERIAL\n\n" + outline;
  return head + (o.guide ? "\n\nTEACHER GUIDANCE: " + o.guide : "") +
    (prior.length ? "\n\nQUESTIONS ALREADY WRITTEN (do not repeat or rephrase; cover different ideas):\n" + prior.slice(-P.prior).map(function (q) { return "- " + q.replace(/\s+/g, " ").slice(0, 100) }).join("\n") : "") +
    "\n\nWrite " + n + " new cards now."
}
async function aiFail(r, who, keyHelp) {
  var m = ""; try { m = (await r.json()).error.message } catch (e) { }
  throw new Error(r.status === 429 ? who + " says the usage limit was reached. Wait a minute and try again, or ask for fewer questions." : r.status === 401 || r.status === 403 ? who + " rejected the key" + (m ? " (" + m + ")" : "") + ". " + keyHelp : who + " error (" + r.status + ")" + (m ? ": " + m : ""))
}
/* providers: each returns the model's text */
async function aiClaudeCall(sys, user, o) {
  var key = S().aiKey, h = { "content-type": "application/json", "anthropic-version": "2023-06-01" };
  if (key) { h["x-api-key"] = key; h["anthropic-dangerous-direct-browser-access"] = "true" }
  var r;
  try { r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: h, body: JSON.stringify({ model: S().aiModel || DEFAULTS.aiModel, max_tokens: 4000, system: sys, messages: [{ role: "user", content: user }] }) }) }
  catch (e) { throw new Error(key ? "Couldn't reach Anthropic. Check your internet connection." : "Claude needs an API key when Recall isn't running inside Claude. Add one in Settings, or choose another AI provider.") }
  if (!r.ok) { if ((r.status === 401 || r.status === 403) && !key) throw new Error("Claude needs an API key. Add one in Settings, or choose another AI provider."); await aiFail(r, "Anthropic", "Check it in Settings.") }
  var d = await r.json(); return (d.content || []).map(function (i) { return i.type === "text" ? i.text : "" }).join("")
}
async function aiGeminiCall(sys, user, o) {
  var key = S().gemKey; if (!key) throw new Error("Add your Gemini API key in Settings first.");
  var model = String(S().gemModel || DEFAULTS.gemModel).replace(/^models\//, ""), r;
  try { r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { maxOutputTokens: 8192, temperature: 0.7 } }) }) }
  catch (e) { throw new Error("Couldn't reach Google. Check your internet connection.") }
  if (r.status === 404) throw new Error("Gemini doesn't know the model \"" + model + "\". In Settings, choose Test key to see the models your key can use.");
  if (r.status === 400) { var m = ""; try { m = (await r.json()).error.message } catch (e) { } throw new Error("Gemini rejected the request" + (m ? ": " + m : "") + ". Check the key and model in Settings.") }
  if (!r.ok) await aiFail(r, "Gemini", "Check it in Settings.");
  var d = await r.json(), c = (d.candidates || [])[0], t = c && c.content && c.content.parts ? c.content.parts.map(function (p) { return p.text || "" }).join("") : "";
  if (!t) throw new Error("Gemini returned nothing" + (d.promptFeedback && d.promptFeedback.blockReason ? " (blocked: " + d.promptFeedback.blockReason + ")" : "") + ". Try again.");
  return t
}
function aiErr(e, fallback) { return (e && e.message) || (e && e.error && (e.error.message || e.error)) || (typeof e === "string" ? e : "") || fallback }
function aiLoadPuter() {
  if (window.puter) return Promise.resolve(window.puter);
  if (aiLoadPuter.p) return aiLoadPuter.p;
  return aiLoadPuter.p = new Promise(function (res, rej) {
    var s = document.createElement("script"); s.src = "https://js.puter.com/v2/";
    s.onload = function () { window.puter ? res(window.puter) : (aiLoadPuter.p = null, rej(new Error("Puter loaded but isn't ready. Reload the page and try again."))) };
    s.onerror = function () { aiLoadPuter.p = null; rej(new Error("Couldn't load Puter. Check your internet connection; some school networks block it.")) };
    document.head.appendChild(s)
  })
}
function aiPuterText(r) {
  if (typeof r === "string") return r;
  var c = r && r.message ? r.message.content : r && r.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map(function (b) { return (b && b.text) || "" }).join("");
  return String((r && r.text) || "")
}
async function aiPuterCall(sys, user, o) {
  if (o.status && !window.puter) o.status("Loading Puter…");
  var p = await aiLoadPuter();
  try {
    if (!(await p.auth.isSignedIn())) { if (o.status) o.status("A Puter sign-in window should open. Allow pop-ups if nothing appears."); await p.auth.signIn() }
    if (o.status) o.status("Writing questions…");
    var opts = {}; if (S().puterModel) opts.model = S().puterModel;
    return aiPuterText(await p.ai.chat([{ role: "system", content: sys }, { role: "user", content: user }], opts))
  } catch (e) { throw new Error("Puter couldn't finish: " + aiErr(e, "the sign-in was closed or the free allowance is used up") + ".") }
}
async function aiChromeSession(system, status) {
  if (typeof LanguageModel === "undefined") throw new Error("Chrome's built-in AI isn't switched on for web pages yet. In Chrome, open chrome://flags/#prompt-api-for-gemini-nano, set it to Enabled, do the same for chrome://flags/#optimization-guide-on-device-model, then restart Chrome and try again." + (window.top !== window.self ? " Recall also seems to be running inside another page; Chrome blocks the AI there, so open Recall's own page (index.html) or choose another provider." : " Or choose Gemini or Claude in Settings."));
  var io = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] }, av;
  try { av = await LanguageModel.availability(io) } catch (e) { io = {}; av = await LanguageModel.availability() }
  if (av === "unavailable") throw new Error("Chrome's built-in AI isn't available on this device (it needs desktop Chrome and enough free disk space). Choose another AI provider in Settings.");
  var opts = { monitor: function (m) { m.addEventListener("downloadprogress", function (e) { if (status) status("Downloading the on-device model (one time only)…", Math.round(e.loaded * 100)) }) } };
  if (io.expectedInputs) { opts.expectedInputs = io.expectedInputs; opts.expectedOutputs = io.expectedOutputs }
  if (system) opts.initialPrompts = [{ role: "system", content: system }];
  return LanguageModel.create(opts)
}
async function aiChromeCall(sys, user, o) {
  var ses = await aiChromeSession(sys, o.status);
  var schema = { type: "object", properties: { cards: { type: "array", items: { type: "object", properties: { type: { type: "string" }, q: { type: "string" }, a: { type: "string" }, correct: { type: "string" }, wrong: { type: "array", items: { type: "string" } }, alt: { type: "array", items: { type: "string" } }, src: { type: "string" }, note: { type: "string" } }, required: ["type", "q"] } } }, required: ["cards"] };
  try {
    if (o.status) o.status("Writing questions…");
    try { return await ses.prompt(user, { responseConstraint: schema }) }
    catch (e) { if (e && e.name === "QuotaExceededError") throw new Error("That section is too long for the on-device model. Choose another AI provider in Settings for long decks."); if (e && e.name === "AbortError") throw e; return await ses.prompt(user) }
  } finally { if (ses && ses.destroy) ses.destroy() }
}
/* ---- sources, plan, blend, coverage ---- */
function aiShort(n) { return String(n).replace(/\.[^.]+$/, "") }
function aiSources() { return iFiles().filter(function (f) { return f.state === "ok" && f.secs.length }).map(function (f) { return { name: f.name, secs: f.secs } }) }
function aiHasContent(s) { return !!(s.body.length || s.notes) }
function aiSplit(total, weights) {
  var sum = weights.reduce(function (a, b) { return a + b }, 0) || 1, raw = weights.map(function (w) { return total * w / sum }), base = raw.map(function (x) { return Math.max(1, Math.floor(x)) });
  var diff = total - base.reduce(function (a, b) { return a + b }, 0), order = raw.map(function (x, i) { return i }).sort(function (a, b) { return (raw[b] - Math.floor(raw[b])) - (raw[a] - Math.floor(raw[a])) });
  for (var k = 0; diff > 0 && k < 500; k++, diff--) base[order[k % order.length]]++;
  for (var j = 0; diff < 0 && j < 500; j++) { var m = base.indexOf(Math.max.apply(null, base)); if (base[m] > 1) { base[m]--; diff++ } else break }
  return base
}
/* how many questions each lesson gets: "auto" scales with the amount of content; connection questions are added when there is more than one lesson */
function aiPlan(sources, setting) {
  var units = sources.map(function (s) { return Math.max(1, s.secs.filter(aiHasContent).length) }), multi = sources.length > 1, per, bridge = 0;
  if (setting === "auto" || !setting) {
    per = units.map(function (u) { return Math.max(6, Math.min(36, Math.round(u * 0.9))) });
    if (multi) bridge = Math.max(4, Math.min(12, Math.round(per.reduce(function (a, b) { return a + b }, 0) * 0.15)))
  } else { var T = +setting; bridge = multi ? Math.max(2, Math.round(T * 0.15)) : 0; per = aiSplit(Math.max(sources.length, T - bridge), units) }
  return { items: sources.map(function (s, i) { return { name: s.name, secs: s.secs, want: per[i] } }), bridge: bridge, total: per.reduce(function (a, b) { return a + b }, 0) + bridge }
}
function aiPlanText(plan) {
  return "Plan: " + plan.items.map(function (it) { return esc(aiShort(it.name)) + " " + it.want }).join(" \u00b7 ") + (plan.bridge ? " \u00b7 connections between lessons " + plan.bridge : "") + " \u00b7 about " + plan.total + " questions in total."
}
function aiCondense(secs, max) {
  var out = "", i;
  for (i = 0; i < secs.length; i++) { var s = secs[i], p = "## " + s.title + (s.body.length ? "\n- " + s.body.slice(0, 2).join("\n- ") : "") + "\n"; if (out.length + p.length > max) break; out += p }
  return out
}
function aiBlendCards(cards) {
  var groups = {}, order = [], bridge = [], seen = {};
  cards.forEach(function (c) { var k = c.q.toLowerCase().replace(/\s+/g, " "); if (seen[k]) return; seen[k] = 1; var f = c.file || ""; if (f === "Connections") { bridge.push(c); return } if (!groups[f]) { groups[f] = []; order.push(f) } groups[f].push(c) });
  var out = [], i = 0, more = true;
  while (more) { more = false; order.forEach(function (f) { if (groups[f][i]) { out.push(groups[f][i]); more = true } }); i++ }
  return out.concat(bridge)
}
function aiNorm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() }
/* approximate: which slides or sections do the questions refer to? */
function aiCoverage(sources, cards) {
  var res = { total: 0, covered: 0, missing: [] };
  sources.forEach(function (src) {
    var mine = cards.filter(function (c) { return c.file === src.name || c.file === "Connections" }).map(function (c) { return { s: aiNorm(c.src), t: aiNorm(c.q + " " + c.a) } });
    src.secs.forEach(function (sec) {
      if (!aiHasContent(sec)) return; res.total++;
      var t = aiNorm(sec.title), hit = t.length >= 3 && mine.some(function (c) { return (c.s && (c.s.indexOf(t) > -1 || (c.s.length >= 4 && t.indexOf(c.s) > -1))) || (t.length >= 8 && c.t.indexOf(t) > -1) });
      if (hit) res.covered++; else res.missing.push({ file: src.name, sec: sec })
    })
  });
  return res
}
async function aiGenerate(plan, o) {
  var pk = aiProvider(), P = AI_PROV[pk], sys = aiSystem(pk === "chrome", o.style), report = o.report || function () { }, stop = o.cancelled || function () { return false }, jobs = [], failed = null;
  o.status = o.status || function (t, pct) { if (typeof pct === "number" || /sign-in|download|loading/i.test(t || "")) report(t, pct, true) };
  plan.items.forEach(function (it) {
    if (!it.want) return; var ch = aiChunks(it.secs, P.chunk), tl = ch.reduce(function (a, c) { return a + c.len }, 0) || 1;
    ch.forEach(function (c) { jobs.push({ kind: "lesson", label: aiShort(it.name), file: it.name, text: c.text, want: Math.max(1, Math.round(it.want * c.len / tl)) }) })
  });
  if (plan.bridge && plan.items.length > 1) { var per = Math.floor(P.chunk / plan.items.length); jobs.push({ kind: "bridge", label: "connections between your lessons", file: "Connections", text: plan.items.map(function (it) { return "=== LESSON: " + aiShort(it.name) + " ===\n" + aiCondense(it.secs, per) }).join("\n"), want: plan.bridge }) }
  var total = jobs.reduce(function (a, j) { return a + Math.ceil(j.want / P.batch) }, 0), done = 0, all = [];
  outer: for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i], got = [], tries = 0, cap = Math.ceil(job.want / P.batch) + 2;
    while (got.length < job.want && tries < cap) {
      if (stop()) { all = all.concat(got.slice(0, job.want)); got = []; break outer }
      tries++;
      var have = all.length + got.length, n = Math.min(P.batch, job.want - got.length);
      report("Writing questions about " + job.label + " (request " + (done + 1) + " of about " + total + ")" + (have ? " \u00b7 " + have + " written so far" : ""), Math.min(99, done / total * 100), true);
      try { var text = await P.call(sys, aiUser(job.text, n, all.concat(got).map(function (c) { return c.q }), o, P, job), o) }
      catch (e) { if (all.length + got.length) { failed = e; all = all.concat(got.slice(0, job.want)); got = []; break outer } throw e }
      done++; got = got.concat(aiParse(text).map(function (c) { c.file = job.file; return c }))
    }
    all = all.concat(got.slice(0, job.want))
  }
  o.warning = failed ? failed.message : "";
  return aiBlendCards(all)
}
/* Import screen: the AI section (only shown when "AI-written questions" is chosen) */
function aiCovHTML() {
  var c = imp.aiCov; if (!c || !c.total) return "";
  var list = c.missing.slice(0, 8).map(function (m) { return esc(m.sec.title) }).join(", ") + (c.missing.length > 8 ? ", and " + (c.missing.length - 8) + " more" : "");
  return '<div class="ainote" id="aicov"><div><b>Coverage:</b> the questions refer to about ' + c.covered + ' of ' + c.total + ' slides or sections with content (an approximate check).</div>' +
    (c.missing.length ? '<div>Not clearly covered yet: ' + list + '.</div><div class="row"><button id="aif" type="button" class="sm">Write questions for the missing parts</button></div>' : "<div>Everything with content looks covered.</div>") + '</div>'
}
function aiPlanNow() { return aiPlan(aiSources(), imp.aiN || "auto") }
function aiControls() {
  var n = String(imp.aiN || "auto"), has = (imp.ai || []).length, P = AI_PROV[aiProvider()];
  return '<p class="hint">Reads each lesson you added and writes questions about the ideas behind it (why, how, compare, predict, apply), not just the slide wording. With more than one lesson, the questions are blended and some connect the lessons. Provider: ' + esc(P.short) + '. <button class="sm" id="aic" type="button">Change in Settings</button></p>' +
    '<label for="aiN">How many questions</label><select id="aiN">' + [["auto", "Automatic (recommended)"], ["15", "About 15"], ["30", "About 30"], ["45", "About 45"], ["60", "About 60"]].map(function (x) { return '<option value="' + x[0] + '"' + (n === x[0] ? " selected" : "") + '>' + x[1] + '</option>' }).join("") + '</select>' +
    '<p class="hint" id="aiplan" style="margin:4px 0 0">' + aiPlanText(aiPlanNow()) + '</p>' +
    '<label for="aiS">Question style</label><select id="aiS">' + Object.keys(AI_STYLES).map(function (k) { return '<option value="' + k + '"' + ((imp.aiS || "mc") === k ? " selected" : "") + '>' + AI_STYLES[k].label + '</option>' }).join("") + '</select><p class="hint" style="margin:4px 0 0">Multiple choice is graded for the student; short answers are checked automatically. Both are quicker to answer than a paragraph.</p>' +
    '<label for="aiG">Level or focus (optional)</label><input type="text" id="aiG" placeholder="e.g. 9th grade biology; stress how the two stages connect" value="' + esc(imp.aiG || "") + '">' +
    '<div class="row"><button class="primary" id="aib" type="button">' + (has ? "Write a new set" : "Write questions with AI") + '</button><button id="aix" type="button" hidden>Stop</button></div>' +
    progHTML("aiprog", "") + '<p class="hint" id="aim" role="status">' + esc(imp.aiMsg || "") + '</p>' + aiCovHTML()
}
function aiWire(v) {
  var c = $("#aic"); if (c) c.onclick = function () { tab = "set"; render() };
  var b = $("#aib"); if (!b) return;
  if (aiProvider() === "puter") aiLoadPuter().catch(function () { });
  function rep(label, pct, busy) { imp.aiLabel = label; if (pct !== undefined) imp.aiPct = pct; progSet("aiprog", imp.aiPct, label, busy) }
  if (imp.aiRunning) { b.disabled = true; $("#aix").hidden = false; progSet("aiprog", imp.aiPct, imp.aiLabel, true) }
  $("#aiN").onchange = function () { imp.aiN = this.value; $("#aiplan").innerHTML = aiPlanText(aiPlanNow()) };
  $("#aix").onclick = function () { imp.aiCancel = true; $("#aix").disabled = true; rep("Stopping after the current request\u2026", undefined, true) };
  async function run(fill) {
    if (imp.aiRunning) return;
    if (!fill && imp.ai && imp.ai.length && !(await askConfirm({ title: "Replace the AI questions you have?", body: "Writing a new set discards the " + imp.ai.length + " questions below. Nothing has been added to your decks yet.", ok: "Write a new set", danger: true }))) return;
    imp.aiN = $("#aiN").value; imp.aiS = $("#aiS").value; imp.aiG = $("#aiG").value.trim(); imp.aiRunning = true; imp.aiCancel = false; imp.aiPct = null; imp.aiMsg = "";
    var plan = aiPlanNow();
    if (fill && imp.aiCov) {
      var by = {}; imp.aiCov.missing.forEach(function (m) { (by[m.file] = by[m.file] || []).push(m.sec) });
      plan = { items: Object.keys(by).map(function (f) { return { name: f, secs: by[f], want: Math.max(2, Math.min(30, Math.ceil(by[f].length * 0.8))) } }), bridge: 0, total: 0 }
    }
    b.disabled = true; var fb = $("#aif"); if (fb) fb.disabled = true; $("#aix").hidden = false; $("#aix").disabled = false; var m = $("#aim"); m.textContent = ""; m.className = "hint"; rep("Getting ready\u2026", null, true);
    var stopTimer = progTimer("aiprog"), o = { count: plan.total, guide: imp.aiG, style: imp.aiS || "mc", report: rep, cancelled: function () { return imp.aiCancel } };
    try {
      var cards = await aiGenerate(plan, o);
      stopTimer(); imp.aiRunning = false;
      if (!cards.length) { progHide("aiprog"); m.className = "hint fl-err"; m.textContent = imp.aiCancel ? "Stopped before any questions were written." : "The AI didn't return any usable questions. Try again."; imp.aiMsg = m.textContent; b.disabled = false; if (fb) fb.disabled = false; $("#aix").hidden = true; return }
      imp.ai = fill ? aiBlendCards((imp.ai || []).concat(cards)) : cards; imp.method = "ai"; imp.aiCov = aiCoverage(aiSources(), imp.ai); rebuild();
      var msg = (imp.aiCancel ? "Stopped. Kept " : "Wrote ") + cards.length + (fill ? " more" : "") + " questions" + (fill ? "" : " (" + imp.ai.length + " in total)") + ". Review them below.";
      progDone("aiprog", msg); imp.aiMsg = o.warning ? "Some requests failed (" + o.warning + "), so you may have fewer questions than planned." : "";
      importView(v); progDone("aiprog", msg);
      var s3 = $("#istep3"); if (s3 && s3.scrollIntoView) s3.scrollIntoView({ behavior: "smooth", block: "start" })
    } catch (e) {
      stopTimer(); imp.aiRunning = false; progHide("aiprog"); m.className = "hint fl-err"; m.textContent = e.message || "Something went wrong."; imp.aiMsg = m.textContent; b.disabled = false; if (fb) fb.disabled = false; $("#aix").hidden = true
    }
  }
  b.onclick = function () { run(false) };
  var f = $("#aif"); if (f) f.onclick = function () { run(true) }
}
/* Settings screen: provider dropdown, a note for each provider, and that provider's fields */
function aiSettings(el) {
  var s = S(), p = aiProvider(), P = AI_PROV[p];
  if (p === "puter") aiLoadPuter().catch(function () { });
  var fields = p === "puter" ? '<div class="row"><button id="pSign" type="button">Sign in to Puter</button></div><label for="puterModel">Model (optional)</label><input type="text" id="puterModel" autocomplete="off" spellcheck="false" value="' + esc(s.puterModel || "") + '" placeholder="Leave empty to use Puter\'s default"><p class="hint" style="margin:4px 0 0">There is no key to paste. Sign in once here, or wait for the sign-in window the first time you write questions.</p>' :
    p === "chrome" ? '<div class="row"><button id="aiChk" type="button">Check this device</button></div>' :
      p === "gemini" ? '<label for="gemKey">Gemini API key</label><input type="password" id="gemKey" autocomplete="off" spellcheck="false" value="' + esc(s.gemKey || "") + '" placeholder="Paste your key"><p class="hint" style="margin:4px 0 0"><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Get a free key in Google AI Studio</a>. Don\'t enter it on a shared computer.</p>' +
        '<label for="gemModel">Model</label><input type="text" id="gemModel" list="gemList" autocomplete="off" spellcheck="false" value="' + esc(s.gemModel || "") + '"><datalist id="gemList">' + AI_GEM_LIST.map(function (m) { return '<option value="' + esc(m) + '">' }).join("") + '</datalist><div class="row"><button id="gemTest" type="button">Test key and list models</button></div>' :
        '<label for="aiKey">Anthropic API key</label><input type="password" id="aiKey" autocomplete="off" spellcheck="false" value="' + esc(s.aiKey || "") + '" placeholder="Leave empty inside Claude"><p class="hint" style="margin:4px 0 0">Stored in this browser only and never included in exports. Don\'t enter it on a shared computer.</p>' +
        '<label for="aiModel">Model</label><input type="text" id="aiModel" autocomplete="off" spellcheck="false" value="' + esc(s.aiModel || "") + '"><p class="hint" style="margin:4px 0 0">Leave as is unless the service reports an unknown model.</p>';
  el.innerHTML = '<label for="aiProv">AI provider</label><select id="aiProv">' + Object.keys(AI_PROV).map(function (k) { return '<option value="' + k + '"' + (k === p ? " selected" : "") + '>' + esc(AI_PROV[k].name) + '</option>' }).join("") + '</select>' +
    '<div class="ainote">' + P.notes.map(function (n) { return '<div><b>' + n[0] + ':</b> ' + esc(n[1]) + '</div>' }).join("") + '</div>' + fields + progHTML("setprog", "") + '<p class="hint" id="aiMsgS" role="status"></p>';
  function msg(t) { $("#aiMsgS").textContent = t }
  function work(t, pct) { progSet("setprog", pct == null ? null : pct, t, pct == null) }
  $("#aiProv").onchange = function () { s.aiProvider = this.value; save(); aiSettings(el) };
  function bind(id, key, fallback) { var i = $("#" + id); if (i) i.onchange = function () { s[key] = this.value.trim() || fallback || ""; this.value = s[key]; save(); msg("Saved.") } }
  bind("gemKey", "gemKey"); bind("gemModel", "gemModel", DEFAULTS.gemModel); bind("aiKey", "aiKey"); bind("aiModel", "aiModel", DEFAULTS.aiModel); bind("puterModel", "puterModel");
  if ($("#pSign")) $("#pSign").onclick = async function () {
    msg(""); work("Opening Puter\u2026");
    try {
      var p = await aiLoadPuter(); if (!(await p.auth.isSignedIn())) { work("Waiting for you to sign in in the Puter window\u2026"); await p.auth.signIn() }
      var u = await p.auth.getUser(); progDone("setprog", "Signed in"); msg("Signed in" + (u && u.username ? " as " + u.username : "") + ". You're ready to write questions.")
    } catch (e) { progHide("setprog"); msg(aiErr(e, "The sign-in didn't finish.") + " If no window opened, allow pop-ups for this page and click again.") }
  };
  if ($("#aiChk")) $("#aiChk").onclick = async function () {
    msg(""); work("Checking this device\u2026");
    try { var ses = await aiChromeSession("", work); if (ses.destroy) ses.destroy(); progDone("setprog", "Ready"); msg("The on-device model is installed and working.") }
    catch (e) { progHide("setprog"); msg(e.message || "Couldn't start the on-device model.") }
  };
  if ($("#gemTest")) $("#gemTest").onclick = async function () {
    var k = ($("#gemKey").value || "").trim(); if (!k) { msg("Paste a key first."); return } s.gemKey = k; save(); msg(""); work("Checking your key with Google\u2026");
    try {
      var r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": k } });
      if (!r.ok) { progHide("setprog"); msg(r.status === 400 || r.status === 403 ? "Google rejected that key." : "Google returned an error (" + r.status + ")."); return }
      var d = await r.json();
      AI_GEM_LIST = (d.models || []).filter(function (m) { return /generateContent/.test((m.supportedGenerationMethods || []).join()) && /gemini/i.test(m.name) }).map(function (m) { return m.name.replace(/^models\//, "") });
      aiSettings(el); progDone("setprog", "Key works"); $("#aiMsgS").textContent = AI_GEM_LIST.length + " models are available; click the Model box to pick one."
    } catch (e) { progHide("setprog"); msg("Couldn't reach Google. Check your internet connection.") }
  }
}
