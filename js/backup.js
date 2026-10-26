/* Backup file: everything that makes a Recall account yours, in one file you can move by any route a school allows
   (Google Drive, Classroom, email, a USB stick). It holds the decks and cards with their study progress (stage, level, due date, misses),
   your cram plans, your daily history and your settings. API keys and sign-in details are never included.
   Restoring MERGES by default: for every card, plan and setting the newer version wins, so nothing is lost. */
function backupPayload() {
    var s = Object.assign({}, DB.settings); SECRETS.forEach(function (k) { delete s[k] });
    return { format: "recall-backup", version: 1, created: Date.now(), updated: DB.updated || Date.now(), owner: (typeof ACCT !== "undefined" && ACCT.user) || DB.owner || "", decks: DB.decks, cards: DB.cards, deleted: DB.deleted || {}, plans: DB.plans || {}, plog: DB.plog || [], log: DB.log || {}, settings: s, widgets: DB.widgets }
}
function backupName() { return "recall-backup-" + today() + ".json" }
function backupSave() {
    var json = JSON.stringify(backupPayload()); S().lastBackup = Date.now(); save();
    return saveFile(backupName(), json).then(function () { return json })
}
function backupAgo() { var t = S().lastBackup; if (!t) return "never"; var m = Math.round((Date.now() - t) / 60000); return m < 2 ? "just now" : m < 90 ? m + " minutes ago" : m < 2880 ? Math.round(m / 60) + " hours ago" : Math.round(m / 1440) + " days ago" }
/* what would restoring this file do? (a dry run on a copy) */
function backupPreview(R) {
    var L = structuredClone(DB); mergeInto(L, R); var mine = {}, theirs = {}, add = 0, upd = 0, keep = 0, gone = 0;
    DB.cards.forEach(function (c) { mine[c.id] = c }); (R.cards || []).forEach(function (c) { theirs[c.id] = c });
    L.cards.forEach(function (c) { if (!mine[c.id]) add++; else if ((c.u || 0) > (mine[c.id].u || 0)) upd++ });
    Object.keys(theirs).forEach(function (id) { if (mine[id] && (mine[id].u || 0) > (theirs[id].u || 0)) keep++ });
    DB.cards.forEach(function (c) { if (!L.cards.some(function (x) { return x.id === c.id })) gone++ });
    var rp = Object.keys(R.plans || {}).filter(function (k) { var p = R.plans[k]; return p.on && p.due > Date.now() }), pAdd = 0, pUpd = 0;
    rp.forEach(function (k) { var lp = (DB.plans || {})[k]; if (!lp || !lp.on) pAdd++; else if ((R.plans[k].u || 0) > (lp.u || 0)) pUpd++ });
    return { add: add, upd: upd, keep: keep, gone: gone, total: (R.cards || []).length, decks: (R.decks || []).length, plans: rp.length, pAdd: pAdd, pUpd: pUpd, newerSettings: (R.updated || 0) > (DB.updated || 0), hasSettings: !!R.settings }
}
function backupApply(R, mode, useSettings) {
    var secrets = {}; SECRETS.forEach(function (k) { if (DB.settings[k] !== undefined) secrets[k] = DB.settings[k] });
    if (mode === "replace") {
        var keep = {}; (R.cards || []).forEach(function (c) { keep[c.id] = 1 }); markGone(DB.cards.filter(function (c) { return !keep[c.id] }).map(function (c) { return c.id }));
        DB.decks = R.decks || []; DB.cards = R.cards || []; DB.log = R.log || {}; DB.plog = R.plog || []; DB.plans = R.plans || {}; Object.keys(R.deleted || {}).forEach(function (k) { DB.deleted[k] = Math.max(DB.deleted[k] || 0, R.deleted[k]) }); DB.cur = "all"; sess = null;
        if (R.settings) DB.settings = Object.assign({}, DEFAULTS, R.settings, secrets); if (R.widgets) DB.widgets = R.widgets
    } else {
        mergeInto(DB, R);
        if (useSettings && R.settings) { DB.settings = Object.assign({}, DEFAULTS, R.settings, secrets); if (R.widgets) DB.widgets = R.widgets }
    }
    DB.cards.forEach(function (c) { if (!c.stage) c.stage = "review"; c.u = c.u || 0; c.miss = c.miss || 0; c.step = c.step || 0 });
    DB.plans = DB.plans || {}; DB.deleted = DB.deleted || {}; normWidgets(); save(); applyTheme(); applyFx()
}
async function backupRestore(file, msg) {
    var R; try { R = JSON.parse(await file.text()) } catch (e) { msg("That file can't be read. Choose a file that was saved with \u201cSave a backup file\u201d."); return }
    if (!R || !Array.isArray(R.cards) || !Array.isArray(R.decks) || !/^recall/.test(String(R.format || ""))) { msg("That doesn't look like a Recall backup file."); return }
    if (R.format === "recall") msg("This is an older card export: it has your cards and progress, but no cram plans or settings.");
    var pv = backupPreview(R), when = R.created ? new Date(R.created).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
    var li = [];
    if (pv.add) li.push(pv.add + " card" + (pv.add === 1 ? " is" : "s are") + " new to this device"); if (pv.upd) li.push(pv.upd + " card" + (pv.upd === 1 ? " has" : "s have") + " newer progress in the backup, so the backup's version is used");
    if (pv.keep) li.push(pv.keep === 1 ? "1 card here is newer than the backup and stays as it is" : pv.keep + " cards here are newer than the backup and stay as they are"); if (!pv.add && !pv.upd) li.push("Every card on this device is already up to date with this backup");
    if (pv.plans) li.push(pv.plans + " cram plan" + (pv.plans === 1 ? "" : "s") + " in the backup" + (pv.pAdd || pv.pUpd ? " (" + (pv.pAdd ? pv.pAdd + " added" : "") + (pv.pAdd && pv.pUpd ? ", " : "") + (pv.pUpd ? pv.pUpd + " updated" : "") + ")" : " (already here)"));
    var html = '<p>' + (when ? 'Saved <b>' + esc(when) + '</b>. ' : "") + 'It holds <b>' + pv.total + ' card' + (pv.total === 1 ? "" : "s") + '</b> in ' + pv.decks + ' deck' + (pv.decks === 1 ? "" : "s") + ', with their study progress' + (pv.hasSettings ? ", your cram plans and your settings" : "") + '.</p><p><b>Merge</b> keeps everything on this device and adds or updates from the backup, newer version of each card first:</p><ul>' + li.map(function (x) { return "<li>" + esc(x) + "</li>" }).join("") + '</ul>' +
        (pv.hasSettings ? '<p class="hint">' + (pv.newerSettings ? "The backup's settings are newer than this device's." : "This device's settings are newer than the backup's.") + '</p>' : "");
    var r = await askChoice({ title: "Restore this backup?", html: html, check: pv.hasSettings ? { label: "Use the settings from the backup (theme, daily limits, AI choice, home layout)", checked: pv.newerSettings } : null, buttons: [{ v: "merge", label: "Merge into this device", cls: "primary" }, { v: "replace", label: "Replace everything here", cls: "danger" }] });
    if (!r) return;
    if (r.v === "replace" && !(await askConfirm({ title: "Replace everything on this device?", body: "The cards, progress and plans here are replaced by the backup's. Cards that are only on this device are deleted. This can't be undone.", ok: "Replace everything", danger: true }))) return;
    backupApply(R, r.v, r.check); render();
    toast(r.v === "replace" ? "Restored the backup. This device now matches it." : "Merged the backup: " + pv.add + " cards added, " + pv.upd + " updated.")
}
function backupHTML() {
    var canShare = false; try { canShare = !!(navigator.canShare && navigator.canShare({ files: [new File(["x"], "x.json", { type: "application/json" })] })) } catch (e) { }
    return '<h2>Backup file</h2><p style="margin-top:0">Move your cards between devices without signing in, even when a network blocks online saving. The file holds <b>your cards with their study progress, your cram plans and your settings</b>. It never contains passwords or API keys.</p>' +
        '<p class="hint">Last backup: <b id="bkago">' + backupAgo() + '</b>. Pictures and audio make the file bigger.</p>' +
        '<div class="row"><button class="primary" id="bksave" type="button">Save a backup file</button>' + (canShare ? '<button id="bkshare" type="button">Share it\u2026</button>' : "") + '<label class="filebtn">Restore from a backup file<input type="file" id="bkfile" accept=".json,application/json"></label></div>' +
        '<p class="hint" id="bkmsg" role="status"></p>' +
        '<details class="adv"><summary>How to move your cards between home and school</summary><ol class="steps"><li>At the first device, press <b>Save a backup file</b>. It lands in your Downloads folder.</li><li>Put the file somewhere the other device can reach: Google Drive, Google Classroom, or an email to yourself.</li><li>On the other device, open that file from Drive, Classroom or email so it is in Downloads, then press <b>Restore from a backup file</b> and choose it.</li><li>Choose <b>Merge</b>. Recall keeps the newer version of every card, so progress from both devices is kept.</li></ol><p class="hint">Do the same in the other direction when you go back. A backup every few days is plenty.</p></details>'
}
function backupWire(el) {
    var msg = function (t) { var m = $("#bkmsg", el); if (m) m.textContent = t };
    $("#bksave", el).onclick = async function () { msg(""); try { await backupSave(); $("#bkago", el).textContent = backupAgo(); msg("Saved " + backupName() + ". Look in your Downloads folder.") } catch (e) { if (e && e.code === "declined") return; msg("Couldn't save the file: " + ((e && e.message) || "unknown error")) } };
    var sh = $("#bkshare", el); if (sh) sh.onclick = async function () {
        try { var json = JSON.stringify(backupPayload()), f = new File([json], backupName(), { type: "application/json" }); await navigator.share({ files: [f], title: "Recall backup" }); S().lastBackup = Date.now(); save(); $("#bkago", el).textContent = backupAgo() } catch (e) { if (e && e.name !== "AbortError") msg("Couldn't share the file. Use Save a backup file instead.") }
    };
    $("#bkfile", el).onchange = function () { var f = this.files[0]; this.value = ""; if (f) backupRestore(f, msg) }
}
