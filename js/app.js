/* Boot */
$("#theme").onclick = function () {
    var r = document.documentElement, d = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme:dark)").matches; r.dataset.theme = d ? "light" : "dark"
};
$("#view").innerHTML = '<div class="panel">' + progHTML("boot", "Loading your cards…") + '</div>'; progSet("boot", null, "Loading your cards…");
$("#syncbox").innerHTML = progHTML("sync", ""); $("#acct").onclick = openAccount; acctPaint();
loadDB().then(function () { render(); acctBoot() });

if (window.claude && claude.use) claude.use("downloads").then(function (d) { DL = d }).catch(function () { });
