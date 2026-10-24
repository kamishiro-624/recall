/* Boot */
$("#theme").onclick = toggleThemeMenu; $("#theme").setAttribute("aria-haspopup", "true");
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (themeNow() === "auto") applyTheme() });
$("#view").innerHTML = '<div class="panel">' + progHTML("boot", "Loading your cards…") + '</div>'; progSet("boot", null, "Loading your cards…");
$("#syncbox").innerHTML = progHTML("sync", ""); $("#acct").onclick = openAccount; acctPaint();
loadDB().then(function () { applyTheme(); applyFx(); render(); acctBoot() });

if (window.claude && claude.use) claude.use("downloads").then(function (d) { DL = d }).catch(function () { });
