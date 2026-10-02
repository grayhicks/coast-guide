/* card_design.js — 10/02 (R-372, R-373). Gray: "a canva style thing... where the card editor and card is on screen...
   place it where i need it to go exactly... Recolor the font, change the fonts, make smaller or larger", then "I need
   to be able to fully customize the entire app with this interphase... everything ive ever told you to edit i need to
   be able to edit as well".
   ONE FILE, TWO READERS: the designer page (admin/designer.html) previews with it and build_html.js bakes
   content/card_style.json into the app with it, so what he saw is exactly what ships.
   A rule names its target one of two ways: a card PART (with a scope: every card, cards like this one, only this card),
   or a SEL, a selector the designer built from whatever he tapped anywhere in the app. A move is a translate, so nothing
   around the part shifts. Every declaration is !important behind a long selector so it wins over the app's own sheet. */
(function (root) {
  "use strict";
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
  /* fonts the app already carries (no download) and the ones the build fetches from Google Fonts the first time a
     saved rule uses them. All are open-licence (OFL or Apache). */
  var BUILT_IN = ["Baloo 2", "Cormorant Garamond", "Nunito", "Sniglet", "Fredoka", "Lilita One", "Caveat Brush",
    "Newsreader", "Playfair Display", "DM Serif Display", "Lora", "Fraunces"];
  var EXTRA = ["Chewy", "Titan One", "Luckiest Guy", "Grandstander", "Bubblegum Sans", "Coiny", "Gluten", "Righteous",
    "Shrikhand", "Paytone One", "Pacifico", "Lobster", "Bangers", "Permanent Marker", "Kalam", "Patrick Hand",
    "Amatic SC", "Bungee", "Rubik", "Poppins", "Montserrat", "Quicksand", "Comfortaa", "Varela Round", "Oswald",
    "Bebas Neue", "Abril Fatface", "Merriweather", "Josefin Sans", "Raleway", "Dancing Script", "Satisfy",
    "Great Vibes", "Sacramento", "Courgette", "Cherry Bomb One", "Rammetto One", "Modak", "Bowlby One", "Fjalla One"];
  var FONTS = BUILT_IN.concat(EXTRA);
  /* the colours this app already uses, so a pick matches something on screen */
  var SWATCHES = [
    "#FFFFFF", "#F4EEE2", "#FFF6E4", "#272117", "#1D2A33", "#10161C",
    "#138567", "#00B08C", "#12A07A", "#2E7D32", "#86EFAC", "#0F766E", "#0E7C86", "#0E9F9A", "#5EEAD4", "#99F6E4",
    "#1C6BB5", "#1A8FC4", "#1EBEE6", "#7DD3FC", "#0B4F6C", "#1E3A8A", "#283593", "#A5B4FC",
    "#B620E0", "#6A1B9A", "#9B4FC2", "#D946EF", "#F0ABFC",
    "#FF3EA5", "#FF6F9C", "#DB2777", "#9D174D", "#E8578E", "#FDA4AF",
    "#B83434", "#B91C1C", "#E8603C", "#FF8058", "#F07A2E", "#C2410C", "#FDBA74", "#BC6E16", "#F6D696", "#E3C471"
  ];
  var EDGES = {
    "": "Card's own",
    none: "No edge or shadow",
    thin: "Thin dark outline",
    thick: "Thick dark outline",
    sticker: "White sticker edge",
    glow: "Glow",
    neon: "Dark halo (like the bar)",
    drop: "Drop shadow"
  };
  var partById = function (id) { for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === id) return PARTS[i]; return null; };
  var esc = function (v) { return String(v).replace(/[^a-zA-Z0-9_\-]/g, ""); };
  var hex = function (v) { return /^#[0-9a-fA-F]{3,8}$/.test(String(v || "")) ? v : ""; };
  var fontOk = function (f) { return FONTS.indexOf(f) > -1; };
  /* a tapped-element selector is only ever classes, tags, attributes and combinators: never braces or tags */
  var selOk = function (s) { return typeof s === "string" && s.length < 400 && /^[a-zA-Z0-9_\-\.\s>\[\]="'^:()#,]+$/.test(s) && !/[{}<]/.test(s); };
  function target(r) {
    var look = r.look === "day" ? ".hk_day" : r.look === "night" ? ":not(.hk_day)" : "";
    /* r.path: exactly the element he tapped, as a class path inside a card (in: "card") or inside the app (in: "app") */
    if (r.path) {
      if (!selOk(r.path)) return "";
      if (r.in === "card") {
        var c = ".card.card:not(.hk_sc)";
        if (r.scope === "kind" && r.value) c += '[data-bub^="' + esc(r.value) + '"]';
        if (r.scope === "card" && r.value) c += '[data-card-id^="' + esc(r.value) + '"]';
        return "html body .hk.hk.hk.hk" + look + " " + c + " " + r.path;
      }
      return r.in === "page" ? "html body " + r.path : "html body .hk.hk.hk.hk" + look + " " + r.path;
    }
    if (r.sel) {
      if (!selOk(r.sel)) return "";
      return r.root === "page" ? "html body " + r.sel : "html body .hk.hk.hk.hk" + look + " " + r.sel;
    }
    var p = partById(r.part); if (!p) return "";
    var card = ".card.card:not(.hk_sc)";
    if (r.scope === "kind" && r.value) card += '[data-bub^="' + esc(r.value) + '"]';
    if (r.scope === "card" && r.value) card += '[data-card-id^="' + esc(r.value) + '"]';
    return "html body .hk.hk.hk.hk" + look + " " + card + " " + p.sel;
  }
  function decls(s) {
    var out = [];
    var dx = Number(s.dx) || 0, dy = Number(s.dy) || 0;
    if (dx || dy) out.push("translate:" + dx + "px " + dy + "px");
    if (Number(s.size) > 0) out.push("font-size:" + Number(s.size) + "px");
    if (s.font && fontOk(s.font)) out.push("font-family:'" + s.font + "',Nunito,sans-serif");
    if (Number(s.weight) > 0) out.push("font-weight:" + Number(s.weight));
    if (hex(s.color)) { out.push("color:" + s.color); out.push("-webkit-text-fill-color:" + s.color); }
    if (hex(s.bg)) out.push("background:" + s.bg);
    if (s.spacing !== undefined && s.spacing !== "" && !isNaN(Number(s.spacing))) out.push("letter-spacing:" + Number(s.spacing) + "px");
    if (Number(s.lh) > 0) out.push("line-height:" + Number(s.lh));
    if (s.tcase === "upper" || s.tcase === "lower" || s.tcase === "none" || s.tcase === "capitalize") out.push("text-transform:" + (s.tcase === "upper" ? "uppercase" : s.tcase === "lower" ? "lowercase" : s.tcase));
    if (s.italic === true) out.push("font-style:italic"); else if (s.italic === false) out.push("font-style:normal");
    if (s.hide === true) out.push("visibility:hidden");
    var e = s.edge;
    if (e === "none") { out.push("-webkit-text-stroke:0"); out.push("text-shadow:none"); }
    if (e === "thin") { out.push("-webkit-text-stroke:1.6px #10161C"); out.push("paint-order:stroke fill"); out.push("text-shadow:none"); }
    if (e === "thick") { out.push("-webkit-text-stroke:3px #10161C"); out.push("paint-order:stroke fill"); out.push("text-shadow:none"); }
    if (e === "sticker") { out.push("-webkit-text-stroke:3px #FFFFFF"); out.push("paint-order:stroke fill"); out.push("text-shadow:1px 1.5px 0 rgba(16,22,28,.55)"); }
    if (e === "glow") { out.push("-webkit-text-stroke:0"); out.push("text-shadow:0 0 6px currentColor,0 0 12px currentColor"); }
    if (e === "neon") { out.push("-webkit-text-stroke:0"); out.push("text-shadow:0 0 1px #0C0A10,0 0 1px #0C0A10,0 0 2px rgba(12,10,16,.85),0 0 4px rgba(12,10,16,.45)"); }
    if (e === "drop") { out.push("-webkit-text-stroke:0"); out.push("text-shadow:1.5px 2px 0 rgba(16,22,28,.55)"); }
    return out;
  }
  function ruleCss(r) {
    if (!r || !r.set) return "";
    var sel = target(r); if (!sel) return "";
    var out = decls(r.set); if (!out.length) return "";
    return sel + "{" + out.map(function (d) { return d + " !important"; }).join(";") + "}";
  }
  function designCss(doc) { return ((doc && doc.rules) || []).map(ruleCss).filter(Boolean).join("\n"); }
  /* fonts a saved design uses that the app does not already carry: the build fetches these */
  function fontsToFetch(doc) {
    var seen = {};
    ((doc && doc.rules) || []).forEach(function (r) { var f = r.set && r.set.font; if (f && EXTRA.indexOf(f) > -1) seen[f] = 1; });
    return Object.keys(seen);
  }
  var api = { PARTS: PARTS, FONTS: FONTS, BUILT_IN: BUILT_IN, EXTRA: EXTRA, SWATCHES: SWATCHES, EDGES: EDGES,
    ruleCss: ruleCss, designCss: designCss, partById: partById, fontsToFetch: fontsToFetch, selOk: selOk };
  if (typeof module === "object" && module.exports) module.exports = api; else root.CardDesign = api;
})(typeof window !== "undefined" ? window : this);
