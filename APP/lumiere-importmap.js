(function () {
  if (window.__lumiereImportMapUrl) return;
  var P = window.PIXI;
  if (!P) return;
  var reserved = {
    "default": 1, "class": 1, "function": 1, "var": 1, "let": 1, "const": 1, "new": 1,
    "delete": 1, "in": 1, "of": 1, "if": 1, "else": 1, "for": 1, "while": 1, "do": 1,
    "switch": 1, "case": 1, "break": 1, "continue": 1, "return": 1, "this": 1, "null": 1,
    "true": 1, "false": 1, "typeof": 1, "void": 1, "with": 1, "yield": 1, "await": 1,
    "import": 1, "export": 1, "enum": 1, "super": 1, "try": 1, "catch": 1, "finally": 1,
    "throw": 1, "instanceof": 1, "debugger": 1, "static": 1, "interface": 1, "package": 1,
    "private": 1, "protected": 1, "public": 1, "implements": 1
  };
  var names = Object.keys(P).filter(function (k) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) && !reserved[k];
  });
  var src = "const P=window.PIXI;export default P;" + names.map(function (k) {
    return "export const " + k + "=P." + k + ";";
  }).join("");
  var url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  var s = document.createElement("script");
  s.type = "importmap";
  s.textContent = JSON.stringify({ imports: { "pixi.js": url } });
  (document.head || document.documentElement).appendChild(s);
  window.__lumiereImportMapUrl = url;
})();
