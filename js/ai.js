/* AI-written questions. Sends slide/document text to the Anthropic Messages API from the browser and turns the reply into cards.
   Inside Claude (artifact preview) no key is needed. Anywhere else the teacher adds an API key in Settings. */
var AI_URL = "https://api.anthropic.com/v1/messages";
var AI_SYS = [
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
  "Output format: one JSON object per line and nothing else (no code fences, no commentary, no line breaks inside a value):",
  "{\"q\": \"question or sentence\", \"a\": \"model answer\", \"src\": \"title of the main slide or section it draws on\", \"note\": \"\"}"
].join("\n");

function aiPiece(s) {
  return "## " + s.title + "\n" + s.body.map(function (b) { return "- " + b.replace(/\s*\n\s*/g, " ") }).join("\n") + (s.notes ? "\nSpeaker notes: " + s.notes : "") + (!s.body.length && !s.notes && s.imgs.length ? "\n(picture only)" : "")
}
function aiChunks(secs) {
  var chunks = [], cur = null;
  secs.forEach(function (s) { var p = aiPiece(s); if (!cur || cur.len + p.length > 30000) { cur = { text: "", len: 0 }; chunks.push(cur) } cur.text += (cur.text ? "\n\n" : "") + p; cur.len += p.length });
  return chunks
}
function aiParse(text) {
  var out = [];
  String(text).split(/\r?\n/).forEach(function (l) {
    l = l.trim(); if (l.charAt(0) !== "{") return;
    var o; try { o = JSON.parse(l) } catch (e) { return }
    var q = String(o.q || "").trim(), a = String(o.a || "").trim();
    if (!q || (!a && !/\{\{c\d+::/.test(q))) return;
    out.push({ q: q, a: a, src: String(o.src || ""), note: String(o.note || "").trim(), ai: true })
  });
  return out
}
async function aiCall(outline, n, prior, o) {
  var key = S().aiKey, h = { "content-type": "application/json", "anthropic-version": "2023-06-01" };
  if (key) { h["x-api-key"] = key; h["anthropic-dangerous-direct-browser-access"] = "true" }
  var msg = "MATERIAL\n\n" + outline + (o.guide ? "\n\nTEACHER GUIDANCE: " + o.guide : "") +
    (prior.length ? "\n\nQUESTIONS ALREADY WRITTEN (do not repeat or rephrase; cover different ideas):\n" + prior.slice(-80).map(function (q) { return "- " + q.replace(/\s+/g, " ").slice(0, 140) }).join("\n") : "") +
    "\n\nWrite " + n + " new cards now.";
  var r;
  try { r = await fetch(AI_URL, { method: "POST", headers: h, body: JSON.stringify({ model: S().aiModel || DEFAULTS.aiModel, max_tokens: 4000, system: AI_SYS, messages: [{ role: "user", content: msg }] }) }) }
  catch (e) { throw new Error(key ? "Couldn't reach the AI service. Check your internet connection." : "AI writing needs an API key when Recall isn't running inside Claude. Add one in Settings.") }
  if (!r.ok) {
    var t = ""; try { t = (await r.json()).error.message } catch (e) { }
    throw new Error(r.status === 401 || r.status === 403 ? (key ? "The API key was rejected. Check it in Settings." : "AI writing needs an API key. Add one in Settings.") : r.status === 429 ? "The AI service is busy or over its limit. Wait a minute and try again." : "AI service error (" + r.status + ")" + (t ? ": " + t : ""))
  }
  var d = await r.json();
  return aiParse((d.content || []).map(function (i) { return i.type === "text" ? i.text : "" }).join(""))
}
async function aiGenerate(secs, o, progress) {
  var chunks = aiChunks(secs), tl = chunks.reduce(function (a, c) { return a + c.len }, 0) || 1, all = [];
  for (var i = 0; i < chunks.length; i++) {
    var want = Math.max(1, Math.round(o.count * chunks[i].len / tl)), got = [], tries = 0;
    while (got.length < want && tries < 4) {
      tries++;
      var res = await aiCall(chunks[i].text, Math.min(10, want - got.length), all.concat(got).map(function (c) { return c.q }), o);
      got = got.concat(res); progress(all.length + got.length, o.count)
    }
    all = all.concat(got.slice(0, want))
  }
  return all
}
/* UI pieces used by the import screen */
function aiPanel() {
  var n = imp.aiN || 30, has = (imp.ai || []).length;
  return '<h3>Questions written by AI</h3><p class="hint">Reads your slides or notes and writes questions about the ideas behind them (why, how, compare, predict, apply) instead of repeating the slide text. The slide text is sent to Anthropic to do this, and nothing else is. If this copy of Recall isn\'t running inside Claude, add an API key in Settings first.</p>' +
    '<label for="aiN">How many questions</label><select id="aiN">' + [15, 30, 45].map(function (x) { return '<option' + (n === x ? " selected" : "") + '>' + x + '</option>' }).join("") + '</select>' +
    '<label for="aiG">Level or focus (optional)</label><input type="text" id="aiG" placeholder="e.g. 9th grade biology; stress how the two stages connect" value="' + esc(imp.aiG || "") + '">' +
    '<div class="row"><button class="primary" id="aib"' + (imp.secs.length ? "" : " disabled") + '>' + (has ? "Write a new set" : "Write questions with AI") + '</button></div><p class="hint" id="aim" role="status">' + esc(imp.secs.length ? (imp.aiMsg || "") : "Import a slide deck or document first.") + '</p>'
}
function aiWire(v) {
  var b = $("#aib"); if (!b) return;
  b.onclick = async function () {
    imp.aiN = +$("#aiN").value; imp.aiG = $("#aiG").value.trim(); b.disabled = true; var m = $("#aim"); m.textContent = "Writing questions…";
    try {
      var cards = await aiGenerate(imp.secs, { count: imp.aiN, guide: imp.aiG }, function (n, t) { m.textContent = "Writing questions… " + n + " of " + t });
      if (!cards.length) { m.textContent = "The AI didn't return any usable questions. Try again."; b.disabled = false; return }
      imp.ai = cards; imp.o = { key: false, terms: false, cloze: false, img: !imp.o || imp.o.img };
      imp.aiMsg = "Wrote " + cards.length + " questions. The slide-text cards above were switched off; turn them back on if you want them too.";
      importView(v); rebuild(); importView(v)
    } catch (e) { m.textContent = e.message || "Something went wrong."; b.disabled = false }
  }
}
