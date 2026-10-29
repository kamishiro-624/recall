/* Themes: a picker in the header menu and in Settings. The choice is remembered on this device and, with an account, on every device. */
var THEMES = [
    { id: "auto", name: "Match my device", sw: ["#f2f4f7", "#0e1424", "#2a4bff"] },
    { id: "light", name: "Light", sw: ["#f2f4f7", "#ffffff", "#2a4bff"] },
    { id: "dark", name: "Dark", sw: ["#0e1424", "#16203a", "#7b93ff"] },
    { id: "matte", name: "Matte black", sw: ["#0a0a0b", "#141415", "#f1f1f4"] },
    { id: "ocean", name: "Ocean", sw: ["#06141a", "#0c212b", "#3dd6e0"] },
    { id: "violet", name: "Violet", sw: ["#100c1d", "#1a1430", "#b49cff"] },
    { id: "rose", name: "Rose", sw: ["#150a10", "#211019", "#ff7aa8"] },
    { id: "paper", name: "Paper", sw: ["#f4efe4", "#fffaf0", "#b24a1a"] },
    { id: "sage", name: "Sage", sw: ["#eef3ee", "#fcfffc", "#2c7a52"] },
    { id: "contrast", name: "High contrast", sw: ["#000000", "#0b0b0b", "#ffe600"] }
];
function themeNow() { var t = (DB && DB.settings && DB.settings.theme) || ""; if (!t) { try { t = localStorage.getItem("recall-theme") || "" } catch (e) { } } return THEMES.some(function (x) { return x.id === t }) ? t : "auto" }
function applyTheme() {
    var t = themeNow(), r = document.documentElement; if (t === "auto") delete r.dataset.theme; else r.dataset.theme = t;
    try { localStorage.setItem("recall-theme", t) } catch (e) { }
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = getComputedStyle(r).getPropertyValue("--bg").trim() || "#f2f4f7"
}
function setTheme(id) { DB.settings.theme = id; applyTheme(); save(); paintThemes() }
function swatchHTML(t) { return '<span class="swatch" aria-hidden="true">' + t.sw.map(function (c) { return '<i style="background:' + c + '"></i>' }).join("") + '</span>' }
function themeOptions(grid) {
    var cur = themeNow();
    return THEMES.map(function (t) { return '<button type="button" class="topt" role="radio" aria-checked="' + (t.id === cur) + '" data-theme-id="' + t.id + '">' + swatchHTML(t) + '<span class="tline"><span class="tn">' + esc(t.name) + '</span>' + (t.id === cur ? '<span class="tc" aria-hidden="true">\u2713</span>' : "") + '</span></button>' }).join("")
}
function wireThemes(root) { root.querySelectorAll("[data-theme-id]").forEach(function (b) { b.onclick = function () { setTheme(b.dataset.themeId) } }) }
function paintThemes() {
    var g = document.getElementById("tgrid"); if (g) { g.innerHTML = themeOptions(); wireThemes(g) }
    var m = document.getElementById("thememenu"); if (m) { m.querySelector(".tlist").innerHTML = themeOptions(); wireThemes(m) }
}
function closeThemeMenu() { var m = document.getElementById("thememenu"); if (m) m.remove(); document.removeEventListener("mousedown", themeAway, true); document.removeEventListener("keydown", themeKey, true) }
function themeAway(e) { var m = document.getElementById("thememenu"); if (m && !m.contains(e.target) && e.target.id !== "theme") closeThemeMenu() }
function themeKey(e) { if (e.key === "Escape") { closeThemeMenu(); var b = document.getElementById("theme"); if (b) b.focus() } }
function toggleThemeMenu() {
    if (document.getElementById("thememenu")) { closeThemeMenu(); return }
    var b = document.getElementById("theme"), r = b.getBoundingClientRect(), m = document.createElement("div"); m.id = "thememenu"; m.className = "tmenu"; m.setAttribute("role", "radiogroup"); m.setAttribute("aria-label", "Theme");
    m.innerHTML = '<h3>Theme</h3><div class="tlist">' + themeOptions() + '</div>'; document.body.appendChild(m);
    m.style.top = Math.round(r.bottom + 8) + "px"; m.style.left = Math.max(12, Math.min(innerWidth - m.offsetWidth - 12, r.right - m.offsetWidth)) + "px";
    wireThemes(m); document.addEventListener("mousedown", themeAway, true); document.addEventListener("keydown", themeKey, true);
    var cur = m.querySelector('[aria-checked="true"]'); if (cur) cur.focus()
}
/* Settings: appearance and effects */
function appearanceHTML() {
    var s = S();
    return '<h2>Appearance and effects</h2><p class="hint" style="margin-top:0">Pick a look. It is remembered on this device, and on your other devices if you sign in.</p><div class="tgrid" id="tgrid" role="radiogroup" aria-label="Theme">' + themeOptions() + '</div>' +
        '<label for="fxm">Animations</label><select id="fxm">' + [["auto", "Match my device (full, unless it asks for less motion)"], ["full", "Full: bursts and confetti when you answer well"], ["calm", "Calm: small animations only"], ["off", "Off"]].map(function (o) { return '<option value="' + o[0] + '"' + ((s.fx || "auto") === o[0] ? " selected" : "") + '>' + o[1] + '</option>' }).join("") + '</select>' +
        '<div class="opts"><label><input type="checkbox" id="snd"' + (s.sound ? " checked" : "") + '> Sound effects (short chimes when you answer)</label><label><input type="checkbox" id="saa"' + (s.autoAdv !== false ? " checked" : "") + '> Move on automatically when a typed answer matches exactly</label><label><input type="checkbox" id="saamc"' + (s.autoAdvMC ? " checked" : "") + '> Also move on after a correct multiple-choice answer (skips the explanations)</label><label><input type="checkbox" id="sacc"' + (s.showAcc !== false ? " checked" : "") + '> Show my accuracy before and during practice and study</label></div>'
}
function appearanceWire(el) {
    wireThemes(el); $("#fxm", el).onchange = function () { S().fx = this.value; applyFx(); save(); if (this.value === "full" || this.value === "auto") fxBurst(this, false) };
    $("#snd", el).onchange = function () { S().sound = this.checked; save(); if (this.checked) sfx("ok") };
    $("#sacc", el).onchange = function () { S().showAcc = this.checked; save() };
    $("#saa", el).onchange = function () { S().autoAdv = this.checked; save() }; $("#saamc", el).onchange = function () { S().autoAdvMC = this.checked; save() }
}
