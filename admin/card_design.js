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
  /* 10/03, J13: any Google font he imports by name is listed in the saved file's "fonts" and allowed like the built-in ones */
  var CUSTOM = [];
  var famOk = function (f) { return typeof f === "string" && /^[A-Za-z][A-Za-z0-9 ]{1,39}$/.test(f); };
  var customOf = function (doc) { return ((doc && doc.fonts) || []).filter(famOk).slice(0, 12); };
  var fontOk = function (f) { return FONTS.indexOf(f) > -1 || CUSTOM.indexOf(f) > -1; };
  /* a tapped-element selector is only ever classes, tags, attributes and combinators: never braces or tags */
  var selOk = function (s) { return typeof s === "string" && s.length < 400 && /^[a-zA-Z0-9_\-\.\s>\[\]="'^$:()#,]+$/.test(s) && !/[{}<]/.test(s); };
  /* 10/03, J13: "$" is allowed so a new-hero piece can be named by the end of its id ([id$="move-sloop"]); the
     day and night copies of the hero carry different front letters on the same piece */
  /* 10/03, J13: every rule starts "html:not(#hk_d) body", and the :not(#id) counts as an id, so a designer rule outranks
     any of the app's own class-only rules, however many classes they stack (a sticker-lettering rule with eleven
     classes beat the ten-class prefix and a pasted colour did not show on place names). */
  var ROOT = "html:not(#hk_d) body";
  function target(r) {
    var look = r.look === "day" ? ".hk_day" : r.look === "night" ? ":not(.hk_day)" : "";
    /* r.path: exactly the element he tapped, as a class path inside a card (in: "card") or inside the app (in: "app") */
    if (r.path) {
      if (!selOk(r.path)) return "";
      if (r.in === "card") {
        var c = ".card.card:not(.hk_sc)";
        if (r.scope === "kind" && r.value) c += '[data-bub^="' + esc(r.value) + '"]';
        if (r.scope === "card" && r.value) c += '[data-card-id^="' + esc(r.value) + '"]';
        return ROOT + " .hk.hk.hk.hk" + look + " " + c + " " + r.path;
      }
      return r.in === "page" ? ROOT + " " + r.path : ROOT + " .hk.hk.hk.hk" + look + " " + r.path;
    }
    if (r.sel) {
      if (!selOk(r.sel)) return "";
      return r.root === "page" ? ROOT + " " + r.sel : ROOT + " .hk.hk.hk.hk" + look + " " + r.sel;
    }
    var p = partById(r.part); if (!p) return "";
    var card = ".card.card:not(.hk_sc)";
    if (r.scope === "kind" && r.value) card += '[data-bub^="' + esc(r.value) + '"]';
    if (r.scope === "card" && r.value) card += '[data-card-id^="' + esc(r.value) + '"]';
    return ROOT + " .hk.hk.hk.hk" + look + " " + card + " " + p.sel;
  }
  function decls(s) {
    var out = [];
    var dx = Number(s.dx) || 0, dy = Number(s.dy) || 0;
    /* 10/02, Gray: "I pressed up keys... on the phone it doesn't move". translate does nothing on a plain inline word, so
       anything not already lifted out of the flow moves by relative offset, which works on every box and still leaves
       the space around it untouched. mv is decided once, when the rule is made, from how the element sat then. */
    /* "mg" (10/03, J13): a hero piece that already slides by translate in its own animation is moved by its margins
       instead (its own margins m0 plus the offset), so the move never stops the animation */
    /* 10/03, Gray: "I should be able to lock the position and it never move and it be like that on all cards". A locked
       piece is pinned at the same spot inside its box on every card (absolute, from the box's left or right edge), so the
       words around it no longer push it about. Its dx/dy are folded into the lock when it is set. */
    if (s.lock && isFinite(Number(s.lock.t))) { out.push("position:absolute"); out.push("top:" + Math.round(Number(s.lock.t)) + "px"); out.push("margin:0");
      if (s.lock.side === "r") { out.push("right:" + Math.round(Number(s.lock.x)) + "px"); out.push("left:auto"); } else out.push("left:" + Math.round(Number(s.lock.x)) + "px");
      dx = 0; dy = 0; }
    var sc = Number(s.scale) > 0 && Number(s.scale) !== 1 ? Math.max(0.2, Math.min(4, Number(s.scale))) : 0, ro = Number(s.rot) ? Math.max(-180, Math.min(180, Number(s.rot))) : 0;
    /* "tf" (10/03, J13): a drawn hero piece is an SVG group, and scale or rotate on one turns it about the corner of the
       whole drawing, so the boat flew off the water. Its move, turn and size go into one transform: the move, then where
       it was drawn (t0), then the turn and size about its own middle (c0) */
    if (s.mv === "tf") {
      var t0 = typeof s.t0 === "string" && /^[a-z0-9().,\s-]*$/i.test(s.t0) ? s.t0 : "", c0 = Array.isArray(s.c0) ? s.c0.map(function (v) { return Number(v) || 0; }) : [0, 0];
      var tf = []; if (dx || dy) tf.push("translate(" + dx + "px," + dy + "px)"); if (t0 && (dx || dy || sc || ro)) tf.push(t0);
      if (sc || ro) { tf.push("translate(" + c0[0] + "px," + c0[1] + "px)"); if (ro) tf.push("rotate(" + ro + "deg)"); if (sc) tf.push("scale(" + sc + ")"); tf.push("translate(" + -c0[0] + "px," + -c0[1] + "px)"); }
      if (tf.length) out.push("transform:" + tf.join(" "));
      dx = dy = sc = ro = 0;
    }
    if (dx || dy) { if (s.mv === "rel") { out.push("position:relative"); out.push("left:" + dx + "px"); out.push("top:" + dy + "px"); }
      else if (s.mv === "mg") { var m0 = Array.isArray(s.m0) ? s.m0 : [0, 0]; out.push("margin-left:" + ((Number(m0[0]) || 0) + dx) + "px"); out.push("margin-top:" + ((Number(m0[1]) || 0) + dy) + "px"); }
      else out.push("translate:" + dx + "px " + dy + "px"); }
    /* 10/03, J13: bigger or smaller and turned, for drawings and pictures as much as words (scale and rotate stack on
       top of any animation the piece already has), and a colour shift for drawings (hue and brightness) */
    if (s.ib === true && (sc || ro)) out.push("display:inline-block");
    if (sc) out.push("scale:" + sc);
    if (ro) out.push("rotate:" + ro + "deg");
    var fx = []; if (Number(s.hue)) fx.push("hue-rotate(" + Math.round(Number(s.hue)) + "deg)"); if (Number(s.bright) > 0 && Number(s.bright) !== 1) fx.push("brightness(" + Math.max(0.3, Math.min(2, Number(s.bright))) + ")"); if (Number(s.sat) >= 0 && s.sat !== undefined && Number(s.sat) !== 1) fx.push("saturate(" + Math.max(0, Math.min(3, Number(s.sat))) + ")");
    if (fx.length) out.push("filter:" + fx.join(" "));
    if (Number(s.size) > 0) out.push("font-size:" + Number(s.size) + "px");
    if (s.font && fontOk(s.font)) out.push("font-family:'" + s.font + "',Nunito,sans-serif");
    if (Number(s.weight) > 0) out.push("font-weight:" + Number(s.weight));
    if (hex(s.color)) { out.push("color:" + s.color); out.push("-webkit-text-fill-color:" + s.color); }
    /* 10/03, J13: a two-colour gradient on the letters (the background is clipped to the text, so it replaces the fill
       behind), and how see-through the piece is, 10% to 100% */
    var grad = Array.isArray(s.grad) && hex(s.grad[0]) && hex(s.grad[1]) ? s.grad : null;
    if (hex(s.bg) && !grad) out.push("background:" + s.bg);
    if (grad) { var ang = [90, 135, 180].indexOf(Number(s.grad[2])) > -1 ? Number(s.grad[2]) : 90;
      out.push("background:linear-gradient(" + ang + "deg," + grad[0] + "," + grad[1] + ")"); out.push("-webkit-background-clip:text"); out.push("background-clip:text");
      out.push("color:transparent"); out.push("-webkit-text-fill-color:transparent"); }
    if (Number(s.opacity) >= 0.1 && Number(s.opacity) < 1) out.push("opacity:" + Math.round(Number(s.opacity) * 100) / 100);
    if (s.spacing !== undefined && s.spacing !== "" && !isNaN(Number(s.spacing))) out.push("letter-spacing:" + Number(s.spacing) + "px");
    if (Number(s.lh) > 0) out.push("line-height:" + Number(s.lh));
    if (s.tcase === "upper" || s.tcase === "lower" || s.tcase === "none" || s.tcase === "capitalize") out.push("text-transform:" + (s.tcase === "upper" ? "uppercase" : s.tcase === "lower" ? "lowercase" : s.tcase));
    if (s.italic === true) out.push("font-style:italic"); else if (s.italic === false) out.push("font-style:normal");
    if (s.hide === true) out.push("visibility:hidden");
    /* 10/03, J13: Bring forward / Send back. z is the piece's stacking number, 0 to 99; zr is set when the piece sat
       in the plain flow and needed position:relative for the number to count (decided once, like mv) */
    if (s.z !== undefined && s.z !== "" && isFinite(Number(s.z))) { if (s.zr === true) out.push("position:relative"); out.push("z-index:" + Math.max(0, Math.min(99, Math.round(Number(s.z))))); }
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
  /* 10/02, Gray: "it says GB in the top of the app... I need to be able to edit that. I need to be able to edit
     everything". New words for one element: its own words drop to size 0 and the new ones are drawn in its ::after
     at the size it was, so colour, font, weight, caps and spacing all still apply. Plain text only: quotes,
     backslashes and anything that could close the style tag are cut, and it is capped at 160 characters. */
  var cssText = function (t) { return String(t).replace(/[\\"<>{}]/g, "").replace(/[\r\n]+/g, " ").slice(0, 160); };
  function ruleCss(r) {
    if (!r || !r.set) return "";
    var sel = target(r); if (!sel) return "";
    var out = decls(r.set), s = r.set, extra = "";
    if (typeof s.text === "string" && s.text.trim()) {
      var px = Number(s.size) > 0 ? Number(s.size) : Number(s.textSize) > 0 ? Number(s.textSize) : 16;
      out = out.filter(function (d) { return d.indexOf("font-size:") !== 0; });
      out.push("font-size:0");
      /* a plain inline word box at 0 px has no height of its own, so the new words drawn by ::after spill out of it and the
         picked box shrank to a thin strip (10/03 grade); as an inline-block it holds them */
      if (s.ib === true) out.push("display:inline-block");
      extra = "\n" + sel.split(",").map(function (x) { return x + "::after"; }).join(",") + "{content:\"" + cssText(s.text) + "\" !important;font-size:" + px + "px !important}" +
        /* 10/03, J13: a title's last word sits in its own little box (so it never wraps away from its ticket mark); new
           words replace the whole title, so the boxes inside step aside too */
        "\n" + sel.split(",").map(function (x) { return x + " > *"; }).join(",") + "{display:none !important}";
    }
    /* 10/03, Gray: "How can I change the shape of the swiggle" and "multiple layers ... different layers of thickness".
       A drawn line he reshaped in the Shape tab is painted as a picture of its new outlines (one per line he made), each
       in its own colour, and the drawing's own path steps aside. A picture, not the CSS "d" property, because iPhones do
       not support "d" (caniuse, 10/03), and not a mask, which would cut off the drawing's shadow. Padding gives the bent
       shape room past the drawing's own box. */
    /* 10/03, Gray: "import things and overlay them and edit... their position and shape and thickness". A picture's
       cut-out shape and the thickness of a border round it */
    var CUTS = { square: "0", rounded: "18%", round: "50%", pill: "999px", arch: "50% 50% 0 0 / 35% 35% 0 0" };
    if (Object.prototype.hasOwnProperty.call(CUTS, s.cut)) { out.push("border-radius:" + CUTS[s.cut]); out.push("overflow:hidden"); }
    if (Number(s.bw) > 0) { out.push("border:" + Math.min(24, Math.round(Number(s.bw))) + "px solid " + (hex(s.bc) || "#FFFFFF")); out.push("box-sizing:border-box"); }
    var sh = shapeOk(s.shape);
    if (sh) {
      var svgs = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + sh.vb + '" preserveAspectRatio="none">' + sh.paths.map(function (q, i) {
        return '<path fill="' + (i === sh.paths.length - 1 && hex(s.color) ? s.color : q.fill) + '" d="' + q.d + '"/>'; }).join("") + '</svg>';
      var u = 'url("data:image/svg+xml,' + encodeURIComponent(svgs).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29") + '")';
      out.push("box-sizing:content-box"); out.push("padding:" + sh.pad.map(function (v) { return v + "px"; }).join(" "));
      out.push("margin:" + sh.pad.map(function (v) { return (v ? -v : 0) + "px"; }).join(" "));
      out.push("background:" + u + " 0 0/100% 100% no-repeat border-box");
      extra += "\n" + sel.split(",").map(function (x) { return x + " path"; }).join(",") + "{visibility:hidden !important}";
    }
    if (!out.length) return "";
    return sel + "{" + out.map(function (d) { return d + " !important"; }).join(";") + "}" + extra;
  }
  function shapeOk(sh) {
    var o = sh && sh.out; if (!o || !Array.isArray(o.paths) || !o.paths.length || o.paths.length > 6) return null;
    var colOk = function (c) { return /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s%]+\))$/.test(String(c || "")); };
    if (!o.paths.every(function (q) { return q && typeof q.d === "string" && q.d.length < 9000 && /^[MLZ0-9.\s-]+$/.test(q.d); })) return null;
    if (typeof o.vb !== "string" || !/^-?[0-9.]+ -?[0-9.]+ [0-9.]+ [0-9.]+$/.test(o.vb)) return null;
    if (!Array.isArray(o.pad) || o.pad.length !== 4 || !o.pad.every(function (v) { return isFinite(Number(v)) && Number(v) >= 0 && Number(v) < 400; })) return null;
    return { vb: o.vb, pad: o.pad.map(function (v) { return Math.round(Number(v) * 10) / 10; }), paths: o.paths.map(function (q) { return { d: q.d, fill: colOk(q.fill) ? q.fill : "#FFFDF8" }; }) };
  }
  function designCss(doc) { CUSTOM = customOf(doc); return ((doc && doc.rules) || []).map(ruleCss).filter(Boolean).join("\n"); }
  /* fonts a saved design uses that the app does not already carry: the build fetches these */
  function fontsToFetch(doc) {
    var seen = {};
    var custom = customOf(doc);
    ((doc && doc.rules) || []).forEach(function (r) { var f = r.set && r.set.font; if (f && (EXTRA.indexOf(f) > -1 || custom.indexOf(f) > -1)) seen[f] = 1; });
    return Object.keys(seen);
  }
  /* 10/02, Gray: "I should literally be able to correct everything and I port new stuff into the hero". An ADD is a
     new piece he places: words, a sticker or a picture, dropped into whatever he had picked (the hero, a card, any
     area). It is a real element appended into that host, absolutely placed, so the app around it never moves and
     it never takes a tap from the app (pointer-events:none). React may redraw the host and drop it, so a watcher
     puts it back. Styling an add is an ordinary rule on its own class, hk_add_<id>, so every tool works on it.
     Same function here (preview) and in the build (inlined), so what he placed is what ships. */
  var STICKERS = ["\u2B50", "\uD83C\uDF0A", "\u2600\uFE0F", "\uD83D\uDC2C", "\uD83D\uDC22", "\uD83C\uDF89", "\uD83D\uDD25", "\u2764\uFE0F", "\uD83C\uDFB5", "\uD83C\uDFD6\uFE0F", "\uD83C\uDF34", "\uD83E\uDD80"];
  function placeAdds(d, list, srcOf) {
    var adds = [], queued = false;
    var idOk = function (v) { return /^[a-z0-9]{4,16}$/.test(String(v || "")); };
    var host = function (a) {
      var pth = String(a.path || ""); if (!/^[a-zA-Z0-9_\-\.\s>\[\]="'^:()#,]+$/.test(pth) || /[{}<]/.test(pth)) return null;
      var base = a.in === "card" ? '.card[data-card-id^="' + String(a.card || "").replace(/[^a-zA-Z0-9_\-]/g, "") + '"] ' : a.in === "page" ? "" : ".hk ";
      try { return d.querySelector(base + pth); } catch (e) { return null; }
    };
    function run() {
      queued = false;
      var keep = {}; adds.forEach(function (a) { keep[a.id] = 1; });
      Array.prototype.forEach.call(d.querySelectorAll("[data-hk-add]"), function (n) { if (!keep[n.getAttribute("data-hk-add")]) n.remove(); });
      adds.forEach(function (a) {
        if (!idOk(a.id)) return;
        var h = host(a); if (!h || h.querySelector('[data-hk-add="' + a.id + '"]')) return;
        if (d.defaultView.getComputedStyle(h).position === "static") h.style.position = "relative";
        var el;
        if (a.kind === "img") { var src = srcOf ? srcOf(a) : ""; if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(src || "")) return; el = d.createElement("img"); el.src = src; el.alt = ""; el.draggable = false; }
        else { el = d.createElement("span"); el.textContent = String(a.text || "").slice(0, 80); }
        el.className = "hk_add_" + a.id + " hk_add"; el.setAttribute("data-hk-add", a.id);
        el.style.cssText = "position:absolute;left:" + (Number(a.x) || 0) + "px;top:" + (Number(a.y) || 0) + "px;z-index:6;pointer-events:none;margin:0;white-space:nowrap;line-height:1.1;font-size:" + (a.kind === "sticker" ? 40 : a.kind === "img" ? 16 : 20) + "px;" +
          (a.kind === "img" ? "width:6em;height:auto;" : a.kind === "text" ? "font-weight:800;color:#FFFFFF;text-shadow:0 1px 3px rgba(0,0,0,.55);" : "");
        h.appendChild(el);
      });
    }
    var queue = function () { if (!queued) { queued = true; (d.defaultView.requestAnimationFrame || setTimeout)(run); } };
    try { new d.defaultView.MutationObserver(queue).observe(d.body, { childList: true, subtree: true }); } catch (e) {}
    var api2 = { set: function (l) { adds = (l || []).slice(0, 40); run(); } };
    api2.set(list); return api2;
  }
  var api = { PARTS: PARTS, STICKERS: STICKERS, placeAdds: placeAdds, FONTS: FONTS, BUILT_IN: BUILT_IN, EXTRA: EXTRA, SWATCHES: SWATCHES, EDGES: EDGES,
    ruleCss: ruleCss, designCss: designCss, famOk: famOk, decls: decls, partById: partById, fontsToFetch: fontsToFetch, selOk: selOk };
  if (typeof module === "object" && module.exports) module.exports = api; else root.CardDesign = api;
})(typeof window !== "undefined" ? window : this);
