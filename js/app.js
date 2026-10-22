/* Boot */
$("#theme").onclick = function () {
    var r = document.documentElement, d = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme:dark)").matches; r.dataset.theme = d ? "light" : "dark"
};
loadDB().then(function () { render() });

if (window.claude && claude.use) claude.use("downloads").then(function (d) { DL = d }).catch(function () { });
