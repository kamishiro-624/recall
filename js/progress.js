/* Progress bars for everything that takes time.
   pct = a number (0-100) for a real percentage, or null for "working, can't tell how long" (animated sweep).
   busy = true adds moving stripes so people can see it hasn't frozen while waiting for a reply. */
function progHTML(id, label) {
    return '<div class="load" id="' + id + '" hidden><div class="load-top"><span class="load-label" role="status" aria-live="polite">' + esc(label || "") + '</span><span class="load-side" aria-hidden="true"><span class="load-pct"></span><span class="load-time"></span></span></div><div class="bar ind" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Progress"><i></i></div></div>'
}
function progSet(id, pct, label, busy) {
    var e = document.getElementById(id); if (!e) return;
    var bar = e.querySelector(".bar"), fill = bar.firstChild, lab = e.querySelector(".load-label"), pc = e.querySelector(".load-pct");
    e.hidden = false; e.classList.remove("done");
    if (label != null && lab.textContent !== label) lab.textContent = label;
    bar.classList.toggle("busy", !!busy);
    if (pct == null) { bar.classList.add("ind"); fill.style.width = ""; bar.removeAttribute("aria-valuenow"); pc.textContent = "" }
    else { pct = Math.max(0, Math.min(100, Math.round(pct))); bar.classList.remove("ind"); fill.style.width = pct + "%"; bar.setAttribute("aria-valuenow", pct); pc.textContent = pct + "%" }
}
function progDone(id, label) {
    var e = document.getElementById(id); if (!e) return;
    progSet(id, 100, label, false); e.classList.add("done"); e.querySelector(".load-time").textContent = ""
}
function progHide(id) { var e = document.getElementById(id); if (e) e.hidden = true }
/* shows how long something has been running, so a slow reply doesn't look like a freeze; returns a function that stops it */
function progTimer(id) {
    var t0 = Date.now(), iv = setInterval(function () {
        var e = document.getElementById(id); if (!e) { clearInterval(iv); return }
        var s = Math.round((Date.now() - t0) / 1000); e.querySelector(".load-time").textContent = Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2)
    }, 1000);
    return function () { clearInterval(iv); var e = document.getElementById(id); if (e) e.querySelector(".load-time").textContent = "" }
}
