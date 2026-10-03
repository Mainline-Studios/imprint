    (function () {
      var pages = document.querySelectorAll(".page");
      if (!pages.length) return;
      var rules = __RULES_JSON__;
      var current = null;
      var token = 0;
      var tally = {};
      var layer = null;
      function paintPoints() {
        var n = 0;
        for (var k in tally) n += Number(tally[k]) || 0;
        var label = String(n);
        var nodes = document.querySelectorAll("[data-points-slot]");
        for (var i = 0; i < nodes.length; i++) {
          var tmpl = nodes[i].getAttribute("data-points-slot") || "";
          var bits = tmpl.split("{{points}}");
          nodes[i].textContent = "";
          for (var b = 0; b < bits.length; b++) {
            nodes[i].appendChild(document.createTextNode(bits[b]));
            if (b < bits.length - 1) {
              var chip = document.createElement("span");
              chip.className = "var-value";
              chip.textContent = label;
              nodes[i].appendChild(chip);
            }
          }
        }
      }
      function reduced() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      }
      function num(el) {
        var m = /^page-(\d+)$/.exec(el.id || "");
        return m ? m[1] : "";
      }
      function clearMotion(el) {
        el.style.transition = "";
        el.style.transform = "";
        el.style.transformOrigin = "";
        el.style.opacity = "";
        el.style.visibility = "";
        el.style.pointerEvents = "";
        el.style.zIndex = "";
        el.style.filter = "";
        el.style.clipPath = "";
      }
      function dropLayer() {
        if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
        layer = null;
        document.body.style.perspective = "";
        var hot = document.querySelectorAll("[data-mm-hot]");
        for (var i = 0; i < hot.length; i++) {
          var prev = hot[i].getAttribute("data-mm-op");
          hot[i].style.opacity = prev == null ? "" : prev;
          hot[i].removeAttribute("data-mm-hot");
          hot[i].removeAttribute("data-mm-op");
        }
      }
      function mark(target) {
        for (var i = 0; i < pages.length; i++) {
          var on = pages[i] === target;
          pages[i].classList.toggle("is-on", on);
          if (on) pages[i].removeAttribute("aria-hidden");
          else pages[i].setAttribute("aria-hidden", "true");
        }
        current = target;
      }
      function settle(target) {
        dropLayer();
        mark(target);
        for (var i = 0; i < pages.length; i++) clearMotion(pages[i]);
      }
      function snap(target) {
        dropLayer();
        for (var i = 0; i < pages.length; i++) pages[i].style.transition = "none";
        mark(target);
        for (var j = 0; j < pages.length; j++) clearMotion(pages[j]);
        requestAnimationFrame(function () {
          for (var k = 0; k < pages.length; k++) {
            if (pages[k].style.transition === "none") pages[k].style.transition = "";
          }
        });
      }
      function legacy(rule) {
        var kind = rule.kind;
        var dir = rule.dir || "left";
        if (kind === "slide-left") return { kind: "slide", dir: "left" };
        if (kind === "slide-right") return { kind: "slide", dir: "right" };
        if (kind === "slide-up") return { kind: "slide", dir: "up" };
        if (kind === "slide-down") return { kind: "slide", dir: "down" };
        if (kind === "zoom") return { kind: "zoom-in", dir: dir };
        return { kind: kind, dir: dir };
      }
      function shift(dir, amount) {
        var signed = dir === "right" || dir === "down" ? -amount : amount;
        if (dir === "up" || dir === "down") return "translateY(" + signed + "%)";
        return "translateX(" + signed + "%)";
      }
      function hideOthers(from, to) {
        for (var i = 0; i < pages.length; i++) {
          if (pages[i] !== from && pages[i] !== to) {
            pages[i].classList.remove("is-on");
            pages[i].setAttribute("aria-hidden", "true");
            clearMotion(pages[i]);
          }
        }
      }
      function prep(el, z) {
        el.style.transition = "none";
        el.style.visibility = "visible";
        el.style.pointerEvents = "none";
        el.style.filter = "";
        el.style.clipPath = "";
        el.style.transformOrigin = "center center";
        el.style.zIndex = String(z);
        el.classList.add("is-on");
        el.removeAttribute("aria-hidden");
      }
      function cubeOf(dir) {
        if (dir === "right") return { fo: "0% 50%", to: "100% 50%", fe: "rotateY(90deg)", ts: "rotateY(-90deg)" };
        if (dir === "up") return { fo: "50% 100%", to: "50% 0%", fe: "rotateX(90deg)", ts: "rotateX(-90deg)" };
        if (dir === "down") return { fo: "50% 0%", to: "50% 100%", fe: "rotateX(-90deg)", ts: "rotateX(90deg)" };
        return { fo: "100% 50%", to: "0% 50%", fe: "rotateY(-90deg)", ts: "rotateY(90deg)" };
      }
      function finish(my, to, ms) {
        current = to;
        window.setTimeout(function () {
          if (my !== token) return;
          settle(to);
        }, ms + 70);
      }
      function firstNamed(page) {
        var map = {};
        var nodes = page.querySelectorAll(".el[data-mm]");
        for (var i = 0; i < nodes.length; i++) {
          var key = nodes[i].getAttribute("data-mm");
          if (key && !map[key]) map[key] = nodes[i];
        }
        return map;
      }
      function uniqueAuto(page) {
        var counts = {};
        var nodes = page.querySelectorAll(".el[data-mm-auto]");
        var i;
        for (i = 0; i < nodes.length; i++) {
          var key = nodes[i].getAttribute("data-mm-auto");
          if (!key) continue;
          counts[key] = (counts[key] || 0) + 1;
        }
        var map = {};
        for (i = 0; i < nodes.length; i++) {
          var auto = nodes[i].getAttribute("data-mm-auto");
          if (auto && counts[auto] === 1) map[auto] = nodes[i];
        }
        return map;
      }
      function hasEl(list, el) {
        for (var i = 0; i < list.length; i++) if (list[i] === el) return true;
        return false;
      }
      function pairsOf(from, to) {
        var pairs = [];
        var used = [];
        var namedFrom = firstNamed(from);
        var namedTo = firstNamed(to);
        for (var name in namedFrom) {
          if (!namedTo[name]) continue;
          pairs.push([namedFrom[name], namedTo[name]]);
          used.push(namedFrom[name]);
          used.push(namedTo[name]);
        }
        var autoFrom = uniqueAuto(from);
        var autoTo = uniqueAuto(to);
        for (var key in autoFrom) {
          if (!autoTo[key]) continue;
          if (hasEl(used, autoFrom[key]) || hasEl(used, autoTo[key])) continue;
          pairs.push([autoFrom[key], autoTo[key]]);
          used.push(autoFrom[key]);
          used.push(autoTo[key]);
        }
        return pairs;
      }
      function rotOf(el) {
        var n = parseFloat(el.getAttribute("data-rot") || "0");
        return n === n ? n : 0;
      }
      function boxOf(el) {
        var page = el.closest(".page");
        var pr = page.getBoundingClientRect();
        return {
          left: pr.left + el.offsetLeft,
          top: pr.top + el.offsetTop,
          width: el.offsetWidth,
          height: el.offsetHeight,
          rot: rotOf(el),
        };
      }
      function hideEl(el) {
        if (el.hasAttribute("data-mm-hot")) return;
        el.setAttribute("data-mm-op", el.style.opacity);
        el.setAttribute("data-mm-hot", "1");
        el.style.opacity = "0";
      }
      function lockClone(clone, source) {
        var s = getComputedStyle(source);
        clone.style.fontSize = s.fontSize;
        clone.style.fontFamily = s.fontFamily;
        clone.style.fontWeight = s.fontWeight;
        clone.style.lineHeight = s.lineHeight;
        clone.style.letterSpacing = s.letterSpacing;
        clone.style.color = s.color;
        clone.style.backgroundColor = s.backgroundColor;
        clone.style.backgroundImage = s.backgroundImage;
        clone.style.borderRadius = s.borderRadius;
        clone.style.clipPath = s.clipPath;
        clone.style.display = s.display;
        clone.style.alignItems = s.alignItems;
        clone.style.justifyContent = s.justifyContent;
        clone.style.padding = s.padding;
        clone.style.textAlign = s.textAlign;
        clone.style.whiteSpace = s.whiteSpace;
        clone.style.textDecoration = "none";
        clone.style.boxSizing = "border-box";
        clone.style.opacity = s.opacity;
      }
      function magic(from, to, ms, ease, my) {
        prep(to, 2);
        prep(from, 1);
        to.style.opacity = "0";
        to.style.transform = "none";
        from.style.opacity = "1";
        from.style.transform = "none";
        void to.offsetWidth;
        var pairs = pairsOf(from, to);
        layer = document.createElement("div");
        layer.className = "mm-layer";
        document.body.appendChild(layer);
        var clones = [];
        for (var i = 0; i < pairs.length; i++) {
          var src = pairs[i][0];
          var dst = pairs[i][1];
          var g0 = boxOf(src);
          var g1 = boxOf(dst);
          var destStyle = getComputedStyle(dst);
          var clone = src.cloneNode(true);
          clone.removeAttribute("id");
          clone.removeAttribute("href");
          clone.removeAttribute("data-points");
          if (clone.querySelectorAll) {
            var links = clone.querySelectorAll("a");
            for (var k = 0; k < links.length; k++) links[k].removeAttribute("href");
          }
          clone.style.position = "fixed";
          clone.style.margin = "0";
          clone.style.left = g0.left + "px";
          clone.style.top = g0.top + "px";
          clone.style.width = g0.width + "px";
          clone.style.height = g0.height + "px";
          clone.style.transform = "rotate(" + g0.rot + "deg)";
          clone.style.transformOrigin = "top left";
          clone.style.pointerEvents = "none";
          clone.style.transition = "none";
          lockClone(clone, src);
          layer.appendChild(clone);
          hideEl(src);
          hideEl(dst);
          clones.push({ node: clone, g1: g1, destStyle: destStyle });
        }
        void layer.offsetWidth;
        var moveSpec = "left " + ms + "ms " + ease + ", top " + ms + "ms " + ease + ", width " + ms + "ms " + ease + ", height " + ms + "ms " + ease + ", transform " + ms + "ms " + ease + ", opacity " + ms + "ms " + ease + ", color " + ms + "ms " + ease + ", background-color " + ms + "ms " + ease + ", border-radius " + ms + "ms " + ease + ", font-size " + ms + "ms " + ease;
        var pageSpec = "opacity " + ms + "ms " + ease;
        to.style.transition = pageSpec;
        from.style.transition = pageSpec;
        to.style.opacity = "1";
        from.style.opacity = "0";
        for (var c = 0; c < clones.length; c++) {
          var item = clones[c];
          item.node.style.transition = moveSpec;
          item.node.style.left = item.g1.left + "px";
          item.node.style.top = item.g1.top + "px";
          item.node.style.width = item.g1.width + "px";
          item.node.style.height = item.g1.height + "px";
          item.node.style.transform = "rotate(" + item.g1.rot + "deg)";
          item.node.style.color = item.destStyle.color;
          item.node.style.backgroundColor = item.destStyle.backgroundColor;
          item.node.style.backgroundImage = item.destStyle.backgroundImage;
          item.node.style.borderRadius = item.destStyle.borderRadius;
          item.node.style.opacity = item.destStyle.opacity;
          item.node.style.fontSize = item.destStyle.fontSize;
        }
        finish(my, to, ms);
      }
      function play(from, to, rule) {
        var my = token;
        var norm = legacy(rule);
        var kind = norm.kind;
        var dir = norm.dir;
        var ms = Math.max(0, Math.min(2000, rule.ms | 0));
        var ease = rule.ease || "ease";
        hideOthers(from, to);
        if (kind === "magic-move") {
          magic(from, to, ms, ease, my);
          return;
        }
        var toZ = kind === "reveal" ? 1 : 2;
        var fromZ = kind === "reveal" ? 2 : 1;
        prep(to, toZ);
        prep(from, fromZ);
        var toOpacity = "1";
        var fromOpacityEnd = "1";
        var toStart = "none";
        var fromStart = "none";
        var fromEnd = "none";
        var toEnd = "none";
        var toFilter = "";
        var fromFilterEnd = "";
        var vertical = dir === "up" || dir === "down";
        if (kind === "fade") {
          toOpacity = "0";
          fromOpacityEnd = "0";
        } else if (kind === "slide") {
          toStart = shift(dir, 100);
          fromOpacityEnd = "0";
        } else if (kind === "push") {
          toStart = shift(dir, 100);
          fromEnd = shift(dir, -100);
        } else if (kind === "cover") {
          toStart = shift(dir, 100);
        } else if (kind === "reveal") {
          fromEnd = shift(dir, -100);
        } else if (kind === "zoom-in") {
          toOpacity = "0";
          fromOpacityEnd = "0";
          toStart = "scale(0.84)";
          fromEnd = "scale(1.08)";
        } else if (kind === "zoom-out") {
          toOpacity = "0";
          fromOpacityEnd = "0";
          toStart = "scale(1.16)";
          fromEnd = "scale(0.82)";
        } else if (kind === "flip") {
          toOpacity = "0";
          fromOpacityEnd = "0";
          toStart = "perspective(1400px) rotateY(-78deg)";
          fromEnd = "perspective(1400px) rotateY(78deg)";
          toEnd = "perspective(1400px) rotateY(0deg)";
        } else if (kind === "cube") {
          var cube = cubeOf(dir);
          document.body.style.perspective = "1800px";
          to.style.transformOrigin = cube.to;
          from.style.transformOrigin = cube.fo;
          toStart = "perspective(1800px) " + cube.ts;
          fromEnd = "perspective(1800px) " + cube.fe;
          fromStart = "perspective(1800px) " + (vertical ? "rotateX(0deg)" : "rotateY(0deg)");
          toEnd = fromStart;
        } else if (kind === "dissolve") {
          toOpacity = "0";
          fromOpacityEnd = "0";
          to.style.filter = "blur(10px)";
          from.style.filter = "blur(0px)";
          toFilter = "blur(0px)";
          fromFilterEnd = "blur(8px)";
        } else if (kind === "wipe") {
          var clip = "inset(0 0 0 100%)";
          if (dir === "right") clip = "inset(0 100% 0 0)";
          else if (dir === "up") clip = "inset(100% 0 0 0)";
          else if (dir === "down") clip = "inset(0 0 100% 0)";
          to.style.clipPath = clip;
        } else if (kind === "spring") {
          toStart = shift(dir, 108);
          fromEnd = shift(dir, -18);
          fromOpacityEnd = "0";
        } else if (kind === "pitch") {
          var spin = dir === "right" || dir === "down" ? 8 : -8;
          toStart = shift(dir, 135) + " rotate(" + spin + "deg)";
          fromEnd = shift(dir, -10);
          fromOpacityEnd = "0";
        }
        to.style.opacity = toOpacity;
        to.style.transform = toStart;
        from.style.opacity = "1";
        from.style.transform = fromStart;
        void to.offsetWidth;
        var spec = "transform " + ms + "ms " + ease + ", opacity " + ms + "ms " + ease + ", filter " + ms + "ms " + ease + ", clip-path " + ms + "ms " + ease;
        to.style.transition = spec;
        from.style.transition = spec;
        to.style.opacity = "1";
        to.style.transform = toEnd;
        from.style.transform = fromEnd;
        from.style.opacity = fromOpacityEnd;
        if (toFilter) to.style.filter = toFilter;
        if (fromFilterEnd) from.style.filter = fromFilterEnd;
        if (kind === "wipe") to.style.clipPath = "inset(0)";
        finish(my, to, ms);
      }
      function show() {
        var id = (location.hash || "").replace(/^#/, "");
        var target = id ? document.getElementById(id) : null;
        if (!target || !target.classList.contains("page")) target = pages[0];
        if (target === pages[0]) tally = {};
        paintPoints();
        var from = current;
        token++;
        dropLayer();
        if (!from || from === target || reduced()) {
          settle(target);
          return;
        }
        var rule = rules[num(from) + ">" + num(target)];
        if (!rule) {
          settle(target);
          return;
        }
        if (rule.kind === "none" || !(rule.ms > 0)) {
          snap(target);
          return;
        }
        play(from, target, rule);
      }
      document.addEventListener("click", function (e) {
        var a = e.target && e.target.closest ? e.target.closest("a") : null;
        if (!a) return;
        var href = a.getAttribute("href") || "";
        if (href.charAt(0) !== "#") return;
        var next = document.getElementById(href.slice(1));
        if (!next || !next.classList.contains("page")) return;
        e.preventDefault();
        var raw = a.getAttribute("data-points");
        if (raw != null && raw !== "" && current) {
          var pts = Number(raw);
          if (pts === pts) tally[num(current)] = pts;
        }
        if (location.hash !== href) location.hash = href;
        else show();
      });
      window.addEventListener("hashchange", show);
      show();
    })();
