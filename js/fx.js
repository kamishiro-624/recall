/* Small celebrations: pops, bursts, confetti and optional sounds. Everything follows the Animations setting. */
function applyFx() { var m = (DB.settings && DB.settings.fx) || "auto"; if (m === "auto") m = matchMedia("(prefers-reduced-motion: reduce)").matches ? "off" : "full"; document.documentElement.dataset.fx = m }
function fxFull() { return document.documentElement.dataset.fx === "full" }
function fxBurst(el, big) {
    if (!fxFull() || !el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect(), n = big ? 30 : 16, layer = document.createElement("div"), cols = ["var(--acc)", "var(--ok)", "var(--mid)", "var(--ink)"];
    layer.className = "fx-layer"; layer.style.left = Math.round(r.left + r.width / 2) + "px"; layer.style.top = Math.round(r.top + r.height / 2) + "px";
    for (var i = 0; i < n; i++) {
        var p = document.createElement("i"), a = Math.random() * Math.PI * 2, d = (big ? 80 : 50) + Math.random() * (big ? 110 : 55);
        p.style.setProperty("--dx", Math.round(Math.cos(a) * d) + "px"); p.style.setProperty("--dy", Math.round(Math.sin(a) * d - 18) + "px"); p.style.setProperty("--rot", Math.round(Math.random() * 360) + "deg");
        p.style.background = cols[i % cols.length]; p.style.animationDelay = Math.round(Math.random() * 70) + "ms"; layer.appendChild(p)
    }
    document.body.appendChild(layer); setTimeout(function () { layer.remove() }, 1200)
}
function fxConfetti() {
    if (!fxFull()) return; var box = document.createElement("div"), cols = ["var(--acc)", "var(--ok)", "var(--mid)", "var(--bad)", "var(--ink)"]; box.className = "fx-confetti";
    for (var i = 0; i < 70; i++) { var p = document.createElement("i"); p.style.left = Math.round(Math.random() * 100) + "%"; p.style.background = cols[i % cols.length]; p.style.animationDuration = (1.4 + Math.random() * 1.6) + "s"; p.style.animationDelay = Math.round(Math.random() * 500) + "ms"; p.style.transform = "rotate(" + Math.round(Math.random() * 360) + "deg)"; box.appendChild(p) }
    document.body.appendChild(box); setTimeout(function () { box.remove() }, 3800)
}
/* numbers on the summary count up from zero */
function fxCount(root) {
    root.querySelectorAll("[data-count]").forEach(function (e) {
        var to = +e.dataset.count; if (!fxFull() || !to) { e.textContent = to; return }
        var t0 = performance.now(), dur = 700; e.textContent = 0;
        (function tick(t) { var k = Math.max(0, Math.min(1, (t - t0) / dur)); e.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick) })(t0)
    })
}
var AC = null;
function sfx(name) {
    if (!(DB.settings && DB.settings.sound)) return;
    try {
        AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var t = AC.currentTime, seq = { ok: [[660, 0], [880, .09]], bad: [[230, 0], [170, .12]], win: [[523, 0], [659, .1], [784, .2], [1047, .3]] }[name];
        seq.forEach(function (n) { var o = AC.createOscillator(), g = AC.createGain(); o.type = name === "bad" ? "triangle" : "sine"; o.frequency.value = n[0]; g.gain.setValueAtTime(.0001, t + n[1]); g.gain.exponentialRampToValueAtTime(.12, t + n[1] + .01); g.gain.exponentialRampToValueAtTime(.0001, t + n[1] + .22); o.connect(g); g.connect(AC.destination); o.start(t + n[1]); o.stop(t + n[1] + .25) })
    } catch (e) { }
}
