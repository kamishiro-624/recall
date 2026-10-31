/* Custom drop-down menus.
   Every <select> is shown as a themed button that opens a themed list (styles are in css/forms.css and follow the active theme).
   The real <select> stays in the page, hidden, and is kept in step: code that reads .value, sets .value or listens for "change" works unchanged.
   Selects added later (every time a screen is re-drawn) are picked up automatically. Keyboard: Enter, Space, Up or Down opens it;
   Up, Down, Home, End and typing move through the list; Enter or Space chooses; Escape closes. */
(function () {
    var seq = 0, cur = null, nativeVal = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value"), nativeIdx = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "selectedIndex");

    function baseName(sel) {
        var lab = sel.id ? document.querySelector('label[for="' + sel.id + '"]') : null;
        if (!lab) lab = sel.closest("label");
        if (lab) { var c = lab.cloneNode(true); c.querySelectorAll("select, .dd").forEach(function (x) { x.remove() }); var t = c.textContent.replace(/\s+/g, " ").trim(); if (t) return t }
        return sel.getAttribute("aria-label") || ""
    }
    function sync(sel) {
        var d = sel._dd; if (!d) return;
        var o = sel.options[nativeIdx.get.call(sel)];
        d.val.textContent = o ? o.text : "";
        d.btn.disabled = sel.disabled;
        if (cur && cur.sel === sel) closeMenu(false)
    }
    function enhance(sel) {
        if (sel._dd || sel.multiple || sel.size > 1 || !sel.parentNode) return;
        var n = ++seq, wrap = document.createElement("span"), btn = document.createElement("button"), sr = document.createElement("span"), val = document.createElement("span");
        wrap.className = "dd";
        if (sel.getAttribute("style")) { wrap.style.cssText = sel.getAttribute("style"); sel.removeAttribute("style") }
        btn.type = "button"; btn.className = "dd-btn"; btn.setAttribute("aria-haspopup", "listbox"); btn.setAttribute("aria-expanded", "false");
        sr.className = "dd-sr"; sr.id = "ddl" + n; sr.textContent = baseName(sel);
        val.className = "dd-val"; val.id = "ddv" + n;
        btn.appendChild(sr); btn.appendChild(val); btn.setAttribute("aria-labelledby", sr.id + " " + val.id);
        sel._dd = { btn: btn, val: val, wrap: wrap, sr: sr };
        sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(btn); wrap.appendChild(sel);
        sel.classList.add("dd-native"); sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
        /* code that sets .value or .selectedIndex directly (without a change event) still updates the button */
        Object.defineProperty(sel, "value", { configurable: true, get: function () { return nativeVal.get.call(sel) }, set: function (v) { nativeVal.set.call(sel, v); sync(sel) } });
        Object.defineProperty(sel, "selectedIndex", { configurable: true, get: function () { return nativeIdx.get.call(sel) }, set: function (v) { nativeIdx.set.call(sel, v); sync(sel) } });
        sel.focus = function (o) { btn.focus(o) };
        btn.onclick = function () { if (cur && cur.sel === sel) closeMenu(true); else openMenu(sel) };
        btn.onkeydown = function (e) { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!(cur && cur.sel === sel)) openMenu(sel) } };
        sync(sel)
    }
    function scan(root) { (root.tagName === "SELECT" ? [root] : Array.prototype.slice.call(root.querySelectorAll("select"))).forEach(enhance) }

    function closeMenu(refocus) {
        if (!cur) return; var c = cur; cur = null;
        c.m.remove(); c.btn.setAttribute("aria-expanded", "false");
        document.removeEventListener("pointerdown", c.away, true); window.removeEventListener("resize", c.gone); document.removeEventListener("scroll", c.scr, true);
        if (refocus && c.btn.isConnected) c.btn.focus()
    }
    function openMenu(sel) {
        closeMenu(false);
        var d = sel._dd, btn = d.btn, m = document.createElement("div"), rows = [], act = -1, typed = "", typedT;
        m.className = "dd-menu"; m.id = "ddm" + (++seq); m.setAttribute("role", "listbox"); m.tabIndex = -1; m.setAttribute("aria-labelledby", d.sr.id);
        function addOpt(o) {
            var r = document.createElement("div"); r.className = "dd-opt"; r.id = "ddo" + (++seq); r.setAttribute("role", "option"); r.setAttribute("aria-selected", o.selected ? "true" : "false");
            if (o.disabled) r.setAttribute("aria-disabled", "true");
            r.innerHTML = '<span class="dd-ck" aria-hidden="true">\u2713</span><span class="dd-tx"></span>'; r.lastChild.textContent = o.label || o.text; r._o = o; m.appendChild(r); rows.push(r)
        }
        Array.prototype.forEach.call(sel.children, function (ch) {
            if (ch.tagName === "OPTGROUP") { var g = document.createElement("div"); g.className = "dd-grp"; g.setAttribute("role", "presentation"); g.textContent = ch.label; m.appendChild(g); Array.prototype.forEach.call(ch.children, function (o) { if (o.tagName === "OPTION") addOpt(o) }) }
            else if (ch.tagName === "OPTION") addOpt(ch)
        });
        if (!rows.length) return;
        function setActive(i, scroll) {
            if (act > -1) rows[act].classList.remove("act"); act = i; rows[i].classList.add("act"); m.setAttribute("aria-activedescendant", rows[i].id);
            if (scroll) rows[i].scrollIntoView({ block: "nearest" })
        }
        function move(dir, from) { var i = from == null ? act : from; do { i += dir } while (i >= 0 && i < rows.length && rows[i]._o.disabled); if (i >= 0 && i < rows.length) setActive(i, true) }
        function choose(i) {
            var o = rows[i]._o; if (o.disabled) return;
            closeMenu(false);
            if (nativeIdx.get.call(sel) !== o.index) { nativeIdx.set.call(sel, o.index); sync(sel); sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })) }
            if (btn.isConnected) btn.focus()
        }
        m.onclick = function (e) { var r = e.target.closest(".dd-opt"); if (r) choose(rows.indexOf(r)) };
        m.onmousemove = function (e) { var r = e.target.closest(".dd-opt"); if (r && !r._o.disabled) { var i = rows.indexOf(r); if (i !== act) setActive(i, false) } };
        m.onkeydown = function (e) {
            var k = e.key;
            if (k === "ArrowDown") { e.preventDefault(); move(1) }
            else if (k === "ArrowUp") { e.preventDefault(); move(-1) }
            else if (k === "Home") { e.preventDefault(); move(1, -1) }
            else if (k === "End") { e.preventDefault(); move(-1, rows.length) }
            else if (k === "Enter" || k === " ") { e.preventDefault(); if (act > -1) choose(act) }
            else if (k === "Escape") { e.preventDefault(); e.stopPropagation(); closeMenu(true) }
            else if (k === "Tab") closeMenu(true)
            else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                typed += k.toLowerCase(); clearTimeout(typedT); typedT = setTimeout(function () { typed = "" }, 700);
                var n = rows.length, s = typed.length > 1 ? act : act + 1;
                for (var j = 0; j < n; j++) { var i = (s + j) % n; if (!rows[i]._o.disabled && (rows[i]._o.label || rows[i]._o.text).toLowerCase().indexOf(typed) === 0) { setActive(i, true); break } }
            }
        };
        var host = btn.closest("dialog[open]") || document.body; host.appendChild(m);
        function place() {
            var r = btn.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, below = vh - r.bottom - 12, above = r.top - 12;
            m.style.minWidth = r.width + "px"; m.style.maxWidth = Math.min(vw - 16, Math.max(r.width, 440)) + "px"; m.style.maxHeight = "320px"; m.style.left = "0px"; m.style.top = "0px";
            var h = m.offsetHeight, up = h > below && above > below;
            m.style.maxHeight = Math.max(120, Math.min(320, up ? above : below)) + "px"; h = m.offsetHeight;
            m.style.top = Math.round(up ? r.top - 4 - h : r.bottom + 4) + "px"; m.style.left = Math.round(Math.max(8, Math.min(r.left, vw - m.offsetWidth - 8))) + "px"
        }
        place();
        var sel0 = rows.findIndex(function (r) { return r._o.selected }); if (sel0 < 0) { move(1, -1) } else setActive(sel0, true);
        var c = cur = { sel: sel, m: m, btn: btn };
        c.away = function (e) { if (!m.contains(e.target) && !btn.contains(e.target)) closeMenu(false) };
        c.gone = function () { closeMenu(false) };
        c.scr = function (e) { if (!m.contains(e.target)) closeMenu(false) };
        document.addEventListener("pointerdown", c.away, true); window.addEventListener("resize", c.gone); document.addEventListener("scroll", c.scr, true);
        btn.setAttribute("aria-expanded", "true"); m.focus({ preventScroll: true })
    }

    /* clicking a <label for="..."> of a hidden select focuses its button */
    document.addEventListener("click", function (e) {
        var l = e.target.closest && e.target.closest("label[for]"); if (!l || e.target.closest(".dd")) return;
        var el = document.getElementById(l.htmlFor); if (el && el._dd) { e.preventDefault(); el._dd.btn.focus() }
    });

    new MutationObserver(function (recs) {
        recs.forEach(function (r) {
            if (r.type === "attributes") { if (r.target._dd) sync(r.target); return }
            r.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n) });
            var t = r.target, s = t.tagName === "SELECT" ? t : (t.closest ? t.closest("select") : null); if (s && s._dd) sync(s)
        });
        if (cur && !cur.sel.isConnected) closeMenu(false)
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
    scan(document.body)
})();
