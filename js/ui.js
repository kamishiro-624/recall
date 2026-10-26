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

/* A dialog with several buttons and an optional tick box. Resolves to { v: "button value", check: true|false }, or null if dismissed. `html` must already be escaped. */
function askChoice(o) {
    return new Promise(function (res) {
        var prev = document.activeElement, d = document.createElement("dialog"); d.className = "cbox wide"; d.setAttribute("aria-labelledby", "cbt");
        d.innerHTML = '<h2 id="cbt">' + esc(o.title) + '</h2><div class="cbody">' + (o.html || "") + '</div>' + (o.check ? '<div class="opts"><label><input type="checkbox" id="cbck"' + (o.check.checked ? " checked" : "") + '> ' + esc(o.check.label) + '</label></div>' : "") +
            '<div class="row cbtns"><button type="button" id="cbn">' + esc(o.cancel || "Cancel") + '</button>' + (o.buttons || []).map(function (b, i) { return '<button type="button" class="' + (b.cls || "") + '" data-i="' + i + '">' + esc(b.label) + '</button>' }).join("") + '</div>';
        document.body.appendChild(d);
        var done = function (v) { var ck = d.querySelector("#cbck"); var r = v == null ? null : { v: v, check: ck ? ck.checked : false }; d.close(); d.remove(); if (prev && prev.focus) try { prev.focus() } catch (e) { } res(r) };
        d.querySelector("#cbn").onclick = function () { done(null) };
        d.querySelectorAll("[data-i]").forEach(function (b) { b.onclick = function () { done(o.buttons[+b.dataset.i].v) } });
        d.addEventListener("cancel", function (e) { e.preventDefault(); done(null) }); d.addEventListener("click", function (e) { if (e.target === d) done(null) });
        d.showModal(); d.querySelector("#cbn").focus()
    })
}
