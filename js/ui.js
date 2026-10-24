/* Shared UI helpers: a confirmation dialog for actions that can't be undone */
function askConfirm(o) {
    return new Promise(function (res) {
        if (typeof HTMLDialogElement === "undefined") { res(window.confirm((o.title || "") + "\n" + (o.body || ""))); return }
        var prev = document.activeElement, d = document.createElement("dialog"); d.className = "cbox"; d.setAttribute("aria-labelledby", "cbt");
        d.innerHTML = '<h2 id="cbt">' + esc(o.title || "Are you sure?") + '</h2>' + (o.body ? '<p>' + esc(o.body) + '</p>' : "") + '<div class="row cbtns"><button type="button" id="cbn">' + esc(o.cancel || "Cancel") + '</button><button type="button" id="cby" class="' + (o.danger ? "danger" : "primary") + '">' + esc(o.ok || "OK") + '</button></div>';
        document.body.appendChild(d);
        var done = function (v) { d.close(); d.remove(); if (prev && prev.focus) try { prev.focus() } catch (e) { } res(v) };
        d.querySelector("#cby").onclick = function () { done(true) }; d.querySelector("#cbn").onclick = function () { done(false) };
        d.addEventListener("cancel", function (e) { e.preventDefault(); done(false) });
        d.addEventListener("click", function (e) { if (e.target === d) done(false) });
        d.showModal(); (o.danger ? d.querySelector("#cbn") : d.querySelector("#cby")).focus()
    })
}
