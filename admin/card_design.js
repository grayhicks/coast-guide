/* card_design.js — 10/02 (R-372). Gray: "a canva style thing... where the card editor and card is on screen. Then, I
   can use the keyboard direction keys and mouse to place it where i need it to go exactly, and move it higher or
   lower exactly, and save it. Recolor the font, change the fonts, make smaller or larger, things like that".
   ONE FILE, TWO READERS: the designer page (admin/designer.html) uses it to preview, and build_html.js uses it to bake
   content/card_style.json into the app, so what he saw on the designer is exactly what ships.
   A move is a translate, so nothing around the part shifts; size, font, colour and weight are plain overrides. Every
   rule is !important behind a long selector so it wins over the card's own sheet. */
(function (root) {
  "use strict";
  /* the parts he can pick, in the order a click is matched (innermost first). label = what the panel calls it */
  var PARTS = [
    { id: "category", sel: ".eyebrow .ebcat", label: "Category" },
    { id: "today", sel: ".eyebrow .ebrow2", label: "Today / Ongoing mark" },
    { id: "kind", sel: ".status > .chip.opkind", label: "Kind of place (New)" },
    { id: "barchip", sel: ".status > .chip", label: "A word in the bar" },
    { id: "lane", sel: ".status .lantag", label: "Tag in the bar" },
    { id: "bar", sel: ".status", label: "The bar under the description" },
    { id: "title", sel: ".hk_h3", label: "Title" },
    { id: "venue", sel: ".venue .venueprimary", label: "Place name" },
    { id: "venueline", sel: ".venue", label: "Place line" },
    { id: "price", sel: ".price", label: "Price" },
    { id: "meta", sel: ".meta", label: "For 2 adults line" },
    { id: "datepill", sel: ".daterail", label: "Date pill" },
    { id: "hours", sel: ".hourslist", label: "Times" },
    { id: "blurb", sel: ".blurb", label: "Description" },
    { id: "icon", sel: ".icoW", label: "Icon circle" }
  ];
  var FONTS = ["(card's own)", "Baloo 2", "Cormorant Garamond", "Nunito", "Sniglet", "Fredoka", "Lilita One",
    "Caveat Brush", "Newsreader", "Playfair Display", "DM Serif Display", "Lora", "Fraunces"];
  var partById = function (id) { for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === id) return PARTS[i]; return null; };
  var esc = function (v) { return String(v).replace(/[^a-zA-Z0-9_ \-]/g, ""); };
  var hex = function (v) { return /^#[0-9a-fA-F]{3,8}$/.test(String(v || "")) ? v : ""; };
  /* one rule -> one CSS rule. scope: all | kind (data-bub prefix) | card (data-card-id). look: all | day | night */
  function ruleCss(r) {
    var p = partById(r.part); if (!p || !r.set) return "";
    var look = r.look === "day" ? ".hk_day" : r.look === "night" ? ":not(.hk_day)" : "";
    var card = ".card.card:not(.hk_sc)";
    if (r.scope === "kind" && r.value) card += '[data-bub^="' + esc(r.value) + '"]';
    if (r.scope === "card" && r.value) card += '[data-card-id^="' + esc(r.value) + '"]';
    var sel = "html body .hk.hk.hk.hk" + look + " " + card + " " + p.sel;
    var s = r.set, out = [];
    var dx = Number(s.dx) || 0, dy = Number(s.dy) || 0;
    if (dx || dy) out.push("translate:" + dx + "px " + dy + "px");
    if (Number(s.size) > 0) out.push("font-size:" + Number(s.size) + "px");
    if (s.font && s.font !== FONTS[0] && FONTS.indexOf(s.font) > 0) out.push("font-family:'" + s.font + "',Nunito,sans-serif");
    if (Number(s.weight) > 0) out.push("font-weight:" + Number(s.weight));
    if (hex(s.color)) { out.push("color:" + s.color); out.push("-webkit-text-fill-color:" + s.color); }
    if (s.outline === "dark") { out.push("-webkit-text-stroke:2px #1D2A33"); out.push("paint-order:stroke fill"); }
    if (s.outline === "none") { out.push("-webkit-text-stroke:0"); out.push("text-shadow:none"); }
    if (!out.length) return "";
    return sel + "{" + out.map(function (d) { return d + " !important"; }).join(";") + "}";
  }
  function designCss(doc) {
    var rules = (doc && doc.rules) || [];
    return rules.map(ruleCss).filter(Boolean).join("\n");
  }
  var api = { PARTS: PARTS, FONTS: FONTS, ruleCss: ruleCss, designCss: designCss, partById: partById };
  if (typeof module === "object" && module.exports) module.exports = api; else root.CardDesign = api;
})(typeof window !== "undefined" ? window : this);
