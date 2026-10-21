/* AI-written questions. Three providers, chosen in Settings:
   chrome = Chrome's built-in on-device model (no key), gemini = Google Gemini API (free key), claude = Anthropic API (key; no key needed inside Claude).
   Slide/document text is the only thing ever sent, and only to the provider you pick (nothing is sent for chrome). */
var AI_FMT_LINES = "Output format: one JSON object per line and nothing else (no code fences, no commentary, no line breaks inside a value):\n{\"q\": \"question or sentence\", \"a\": \"model answer\", \"src\": \"title of the main slide or section it draws on\", \"note\": \"\"}";
var AI_FMT_JSON = "Output format: a single JSON object {\"cards\": [ ... ]}. Each card is {\"q\": \"question or sentence\", \"a\": \"model answer\", \"src\": \"title of the main slide or section it draws on\", \"note\": \"\"}.";
function aiSystem(json) {
  return [
    "You write study cards for a classroom spaced-repetition app. You are given the text of a teacher's slides or notes (titles, bullets, speaker notes). The slides are only SOURCE MATERIAL: turn the ideas behind them into questions that make students think, so that learning the cards means understanding the topic, not memorizing the slides.",
    "",
    "Write cards that:",
    "- ask WHY or HOW something happens (mechanisms, cause and effect)",
    "- compare and contrast related ideas",
    "- connect two ideas or stages and show how one depends on the other",
    "- predict what happens if a condition changes, or explain an unexpected result",
    "- apply the idea to a new, concrete scenario the slides did not mention",
    "- interpret an experiment or graph described in words",
    "- sparingly (at most one card in five) check a key term with a fill-in-the-blank card",
    "",
    "Rules:",
    "- Every card must make sense on its own. Never mention 'the slide', 'the presentation' or slide order. Put any context the student needs into the question.",
    "- Do not simply turn a bullet into a question. If the answer could be copied word for word from one slide line, rewrite the question so it needs explanation or reasoning.",
    "- Answers are short model answers (1 to 3 sentences) that include the reasoning, not just a single word, so a student can judge their own response.",
    "- Be accurate. If the slides contain a mistake or an oversimplification, write the correct version and put a short teacher note in \"note\" (for example: Slide says X; the accurate statement is Y). Otherwise leave note empty.",
    "- Cover the whole range of the material. Never repeat or rephrase a question that was already written.",
    "- Pitch the wording to the level in the teacher's guidance. If there is none, assume a high-school class.",
    "- Plain text only, no markdown. For a fill-in card, write a complete sentence with the hidden words wrapped like {{c1::hidden words}}, with enough context to be answerable; \"a\" may be empty or one extra line.",
    "",
    json ? AI_FMT_JSON : AI_FMT_LINES
  ].join("\n")
}
var AI_GEM_LIST = [];
var AI_PROV = {
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
function aiProvider() { var p = S().aiProvider; return AI_PROV[p] ? p : "chrome" }
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
    if (!o) return; var q = String(o.q || "").trim(), a = String(o.a || "").trim();
    if (!q || (!a && !/\{\{c\d+::/.test(q))) return;
    out.push({ q: q, a: a, src: String(o.src || ""), note: String(o.note || "").trim(), ai: true })
  });
  return out
}
function aiUser(outline, n, prior, o, P) {
  return "MATERIAL\n\n" + outline + (o.guide ? "\n\nTEACHER GUIDANCE: " + o.guide : "") +
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
async function aiChromeSession(system, status) {
  if (typeof LanguageModel === "undefined") throw new Error("Chrome's built-in AI isn't switched on for web pages yet. In Chrome, open chrome://flags/#prompt-api-for-gemini-nano, set it to Enabled, do the same for chrome://flags/#optimization-guide-on-device-model, then restart Chrome and try again." + (window.top !== window.self ? " Recall also seems to be running inside another page; Chrome blocks the AI there, so open Recall's own page (index.html) or choose another provider." : " Or choose Gemini or Claude in Settings."));
  var io = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] }, av;
  try { av = await LanguageModel.availability(io) } catch (e) { io = {}; av = await LanguageModel.availability() }
  if (av === "unavailable") throw new Error("Chrome's built-in AI isn't available on this device (it needs desktop Chrome and enough free disk space). Choose Gemini or Claude in Settings instead.");
  var opts = { monitor: function (m) { m.addEventListener("downloadprogress", function (e) { if (status) status("Downloading the on-device model… " + Math.round(e.loaded * 100) + "%") }) } };
  if (io.expectedInputs) { opts.expectedInputs = io.expectedInputs; opts.expectedOutputs = io.expectedOutputs }
  if (system) opts.initialPrompts = [{ role: "system", content: system }];
  return LanguageModel.create(opts)
}
async function aiChromeCall(sys, user, o) {
  var ses = await aiChromeSession(sys, o.status);
  var schema = { type: "object", properties: { cards: { type: "array", items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" }, src: { type: "string" }, note: { type: "string" } }, required: ["q", "a"] } } }, required: ["cards"] };
  try {
    if (o.status) o.status("Writing questions…");
    try { return await ses.prompt(user, { responseConstraint: schema }) }
    catch (e) { if (e && e.name === "QuotaExceededError") throw new Error("That section is too long for the on-device model. Choose Gemini or Claude in Settings for long decks."); if (e && e.name === "AbortError") throw e; return await ses.prompt(user) }
  } finally { if (ses && ses.destroy) ses.destroy() }
}
async function aiGenerate(secs, o, progress) {
  var pk = aiProvider(), P = AI_PROV[pk], chunks = aiChunks(secs, P.chunk), tl = chunks.reduce(function (a, c) { return a + c.len }, 0) || 1, all = [], sys = aiSystem(pk === "chrome");
  for (var i = 0; i < chunks.length; i++) {
    var want = Math.max(1, Math.round(o.count * chunks[i].len / tl)), got = [], tries = 0, cap = Math.ceil(want / P.batch) + 2;
    while (got.length < want && tries < cap) {
      tries++;
      var n = Math.min(P.batch, want - got.length), text = await P.call(sys, aiUser(chunks[i].text, n, all.concat(got).map(function (c) { return c.q }), o, P), o);
      got = got.concat(aiParse(text)); progress(Math.min(o.count, all.length + got.length), o.count)
    }
    all = all.concat(got.slice(0, want))
  }
  return all
}
/* import screen pieces */
function aiPanel() {
  var n = imp.aiN || 30, has = (imp.ai || []).length, P = AI_PROV[aiProvider()];
  return '<h3>Questions written by AI</h3><p class="hint">Reads your slides or notes and writes questions about the ideas behind them (why, how, compare, predict, apply) instead of repeating the slide text. Provider: ' + esc(P.short) + '. <button class="sm" id="aic" type="button">Change in Settings</button></p>' +
    '<label for="aiN">How many questions</label><select id="aiN">' + [15, 30, 45].map(function (x) { return '<option' + (n === x ? " selected" : "") + '>' + x + '</option>' }).join("") + '</select>' +
    '<label for="aiG">Level or focus (optional)</label><input type="text" id="aiG" placeholder="e.g. 9th grade biology; stress how the two stages connect" value="' + esc(imp.aiG || "") + '">' +
    '<div class="row"><button class="primary" id="aib"' + (imp.secs.length ? "" : " disabled") + '>' + (has ? "Write a new set" : "Write questions with AI") + '</button></div><p class="hint" id="aim" role="status">' + esc(imp.secs.length ? (imp.aiMsg || "") : "Import a slide deck or document first.") + '</p>'
}
function aiWire(v) {
  var c = $("#aic"); if (c) c.onclick = function () { tab = "set"; render() };
  var b = $("#aib"); if (!b) return;
  b.onclick = async function () {
    imp.aiN = +$("#aiN").value; imp.aiG = $("#aiG").value.trim(); b.disabled = true; var m = $("#aim"); m.textContent = "Writing questions…";
    var cnt = 0;
    try {
      var cards = await aiGenerate(imp.secs, { count: imp.aiN, guide: imp.aiG, status: function (t) { m.textContent = t } }, function (n, t) { cnt = n; m.textContent = "Writing questions… " + n + " of " + t });
      if (!cards.length) { m.textContent = "The AI didn't return any usable questions. Try again."; b.disabled = false; return }
      imp.ai = cards; imp.o = { key: false, terms: false, cloze: false, img: !imp.o || imp.o.img };
      imp.aiMsg = "Wrote " + cards.length + " questions. The slide-text cards above were switched off; turn them back on if you want them too.";
      importView(v); rebuild(); importView(v)
    } catch (e) { m.textContent = e.message || "Something went wrong."; b.disabled = false }
  }
}
/* Settings screen: provider dropdown, a note for each provider, and that provider's fields */
function aiSettings(el) {
  var s = S(), p = aiProvider(), P = AI_PROV[p];
  var fields = p === "chrome" ? '<div class="row"><button id="aiChk" type="button">Check this device</button></div>' :
    p === "gemini" ? '<label for="gemKey">Gemini API key</label><input type="password" id="gemKey" autocomplete="off" spellcheck="false" value="' + esc(s.gemKey || "") + '" placeholder="Paste your key"><p class="hint" style="margin:4px 0 0"><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Get a free key in Google AI Studio</a>. Don\'t enter it on a shared computer.</p>' +
      '<label for="gemModel">Model</label><input type="text" id="gemModel" list="gemList" autocomplete="off" spellcheck="false" value="' + esc(s.gemModel || "") + '"><datalist id="gemList">' + AI_GEM_LIST.map(function (m) { return '<option value="' + esc(m) + '">' }).join("") + '</datalist><div class="row"><button id="gemTest" type="button">Test key and list models</button></div>' :
      '<label for="aiKey">Anthropic API key</label><input type="password" id="aiKey" autocomplete="off" spellcheck="false" value="' + esc(s.aiKey || "") + '" placeholder="Leave empty inside Claude"><p class="hint" style="margin:4px 0 0">Stored in this browser only and never included in exports. Don\'t enter it on a shared computer.</p>' +
      '<label for="aiModel">Model</label><input type="text" id="aiModel" autocomplete="off" spellcheck="false" value="' + esc(s.aiModel || "") + '"><p class="hint" style="margin:4px 0 0">Leave as is unless the service reports an unknown model.</p>';
  el.innerHTML = '<label for="aiProv">AI provider</label><select id="aiProv">' + Object.keys(AI_PROV).map(function (k) { return '<option value="' + k + '"' + (k === p ? " selected" : "") + '>' + esc(AI_PROV[k].name) + '</option>' }).join("") + '</select>' +
    '<div class="ainote">' + P.notes.map(function (n) { return '<div><b>' + n[0] + ':</b> ' + esc(n[1]) + '</div>' }).join("") + '</div>' + fields + '<p class="hint" id="aiMsgS" role="status"></p>';
  function msg(t) { $("#aiMsgS").textContent = t }
  $("#aiProv").onchange = function () { s.aiProvider = this.value; save(); aiSettings(el) };
  function bind(id, key, fallback) { var i = $("#" + id); if (i) i.onchange = function () { s[key] = this.value.trim() || fallback || ""; this.value = s[key]; save(); msg("Saved.") } }
  bind("gemKey", "gemKey"); bind("gemModel", "gemModel", DEFAULTS.gemModel); bind("aiKey", "aiKey"); bind("aiModel", "aiModel", DEFAULTS.aiModel);
  if ($("#aiChk")) $("#aiChk").onclick = async function () {
    msg("Checking…");
    try { var ses = await aiChromeSession("", function (t) { msg(t) }); if (ses.destroy) ses.destroy(); msg("Ready. The on-device model is installed and working.") }
    catch (e) { msg(e.message || "Couldn't start the on-device model.") }
  };
  if ($("#gemTest")) $("#gemTest").onclick = async function () {
    var k = ($("#gemKey").value || "").trim(); if (!k) { msg("Paste a key first."); return } s.gemKey = k; save(); msg("Checking…");
    try {
      var r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": k } });
      if (!r.ok) { msg(r.status === 400 || r.status === 403 ? "Google rejected that key." : "Google returned an error (" + r.status + ")."); return }
      var d = await r.json();
      AI_GEM_LIST = (d.models || []).filter(function (m) { return /generateContent/.test((m.supportedGenerationMethods || []).join()) && /gemini/i.test(m.name) }).map(function (m) { return m.name.replace(/^models\//, "") });
      aiSettings(el); $("#aiMsgS").textContent = "The key works. " + AI_GEM_LIST.length + " models are available; click the Model box to pick one."
    } catch (e) { msg("Couldn't reach Google. Check your internet connection.") }
  }
}
