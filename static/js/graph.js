/* ==========================================================================
   Richard J. Barker Knowledge Graph Explorer
   Interactive Canvas + D3 Force Simulation Engine
   Features:
     - 4 Layouts: Force Physics, Concentric Orbit, Clustered Islands, Hierarchical Tree
     - Smooth Zoom & Pan (mousewheel, drag, touch, control dock)
     - Neighbor highlighting on hover with dimming
     - Interactive Inspector Drawer on click with neighbor jump
     - Dynamic filters (Node Type, Theme, Year timeline slider, Search auto-center)
     - CoSE light/dark theme synchronization
   ========================================================================== */

(function () {
  "use strict";

  var canvas, ctx;
  var width = 1200, height = 800;
  var dpr = window.devicePixelRatio || 1;
  var rawData = null;
  var sim = null;

  // Viewport transform (Pan & Zoom)
  var transform = { x: 0, y: 0, k: 1 };
  var isDragging = false;
  var dragStart = { x: 0, y: 0 };
  var draggedNode = null;
  var hoveredNode = null;
  var selectedNode = null;

  // Filters & State
  var state = {
    layout: "force", // "force" | "concentric" | "clustered" | "hierarchical"
    searchQuery: "",
    yearMin: 2002,
    yearMax: 2026,
    types: {
      theme: true,
      publication: true,
      tool: true,
      grant: true,
      institution: true,
      organism: true
    },
    themeFilter: "all",
    paused: false
  };

  // CoSE Color Palettes for Light and Dark Modes
  var PALETTES = {
    light: {
      bg: "#f5f8f9",
      text: "#0f2a33",
      textMuted: "#5f7f8a",
      link: "rgba(95, 127, 138, 0.28)",
      linkHighlight: "#0f7f9f",
      linkHighlightWidth: 2.2,
      halo: "rgba(15, 127, 159, 0.22)",
      types: {
        theme: "#004053",
        publication: "#0f7f9f",
        tool: "#3f7d4e",
        grant: "#d9822b",
        institution: "#5590ad",
        organism: "#2b8a3e"
      }
    },
    dark: {
      bg: "#0a1a20",
      text: "#e4eef1",
      textMuted: "#8ba6af",
      link: "rgba(79, 192, 221, 0.22)",
      linkHighlight: "#4fc0dd",
      linkHighlightWidth: 2.5,
      halo: "rgba(79, 192, 221, 0.35)",
      types: {
        theme: "#7ec3d8",
        publication: "#4fc0dd",
        tool: "#8fcf9d",
        grant: "#f5a742",
        institution: "#8db7cf",
        organism: "#51cf66"
      }
    }
  };

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  // ---- Setup Canvas & Resize ----
  function initCanvas() {
    var container = document.getElementById("graph-container");
    if (!container) return false;

    canvas = document.getElementById("graph-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "graph-canvas";
      container.appendChild(canvas);
    }
    ctx = canvas.getContext("2d");

    function resize() {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || (window.innerHeight - 140);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sim) {
        sim.force("center", d3.forceCenter(width / 2, height / 2));
        sim.alpha(0.3).restart();
      }
      render();
    }
    window.addEventListener("resize", resize);
    resize();
    return true;
  }

  // ---- Load Data ----
  function loadGraphData() {
    var dataEl = document.getElementById("graph-data");
    if (dataEl) {
      try {
        rawData = JSON.parse(dataEl.textContent);
        setupGraph();
        return;
      } catch (e) {
        console.error("Failed to parse inline graph-data", e);
      }
    }
    fetch("../data/graph.json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        rawData = d;
        setupGraph();
      })
      .catch(function (err) {
        console.error("Failed to load graph.json", err);
      });
  }

  // ---- Active Filter Evaluation ----
  function isNodeVisible(n) {
    if (!state.types[n.type]) return false;
    if (state.themeFilter !== "all" && n.group !== state.themeFilter && n.id !== ("theme-" + state.themeFilter)) {
      return false;
    }
    if (n.year && (n.year < state.yearMin || n.year > state.yearMax)) {
      return false;
    }
    if (state.searchQuery) {
      var q = state.searchQuery.toLowerCase();
      var hay = (n.label + " " + (n.description || "") + " " + (n.venue || "") + " " + (n.authors ? n.authors.join(" ") : "")).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function getActiveGraph() {
    if (!rawData) return { nodes: [], links: [] };
    var nodeMap = {};
    var activeNodes = [];
    rawData.nodes.forEach(function (n) {
      if (isNodeVisible(n)) {
        nodeMap[n.id] = n;
        activeNodes.push(n);
      }
    });

    var activeLinks = [];
    rawData.links.forEach(function (l) {
      var s = typeof l.source === "object" ? l.source.id : l.source;
      var t = typeof l.target === "object" ? l.target.id : l.target;
      if (nodeMap[s] && nodeMap[t]) {
        activeLinks.push(Object.assign({}, l, { source: nodeMap[s], target: nodeMap[t] }));
      }
    });

    return { nodes: activeNodes, links: activeLinks };
  }

  // ---- Neighbor Lookups ----
  function getConnectedNodeIds(targetNode) {
    if (!targetNode || !rawData) return new Set();
    var set = new Set();
    set.add(targetNode.id);
    rawData.links.forEach(function (l) {
      var s = typeof l.source === "object" ? l.source.id : l.source;
      var t = typeof l.target === "object" ? l.target.id : l.target;
      if (s === targetNode.id) set.add(t);
      if (t === targetNode.id) set.add(s);
    });
    return set;
  }

  // ---- Simulation & Layout Engines ----
  function setupGraph() {
    if (!window.d3) {
      console.error("D3 library not loaded.");
      return;
    }
    applyLayout(state.layout);
    setupEvents();
    updateStatsCounter();
    fitToScreen(false);
  }

  function applyLayout(layoutName) {
    state.layout = layoutName;
    var g = getActiveGraph();

    if (sim) sim.stop();

    if (layoutName === "force") {
      sim = d3.forceSimulation(g.nodes)
        .force("link", d3.forceLink(g.links).id(function (d) { return d.id; }).distance(function (l) {
          if (l.type === "thematic") return 75;
          if (l.type === "software") return 55;
          return 90;
        }))
        .force("charge", d3.forceManyBody().strength(function (d) {
          return d.type === "theme" ? -550 : -160;
        }))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(function (d) { return (d.radius || 14) + 12; }))
        .alpha(0.8)
        .on("tick", render);

    } else if (layoutName === "concentric") {
      var cx = width / 2, cy = height / 2;
      var rMap = { theme: 0, grant: 140, organism: 210, institution: 280, publication: 370, tool: 450 };
      var groups = {};
      g.nodes.forEach(function (n) {
        groups[n.type] = groups[n.type] || [];
        groups[n.type].push(n);
      });

      Object.keys(groups).forEach(function (type) {
        var list = groups[type];
        var radius = rMap[type] || 320;
        if (radius === 0) {
          list.forEach(function (n, i) {
            var a = (i / list.length) * Math.PI * 2;
            n.fx = cx + Math.cos(a) * 60;
            n.fy = cy + Math.sin(a) * 60;
          });
        } else {
          list.forEach(function (n, i) {
            var a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
            n.fx = cx + Math.cos(a) * radius;
            n.fy = cy + Math.sin(a) * radius;
          });
        }
      });

      sim = d3.forceSimulation(g.nodes)
        .force("link", d3.forceLink(g.links).id(function (d) { return d.id; }).strength(0.05))
        .alpha(0.3)
        .on("tick", render);

    } else if (layoutName === "clustered") {
      var cx = width / 2, cy = height / 2;
      var clusterCenters = {
        "space-cea": { x: cx - 240, y: cy - 140 },
        "ai-data": { x: cx + 240, y: cy - 140 },
        "biomanufacturing": { x: cx - 220, y: cy + 180 },
        "phenotyping": { x: cx + 220, y: cy + 180 },
        "outreach": { x: cx, y: cy },
        "institution": { x: cx, y: cy - 280 },
        "grant": { x: cx, y: cy + 300 }
      };

      g.nodes.forEach(function (n) {
        delete n.fx;
        delete n.fy;
      });

      sim = d3.forceSimulation(g.nodes)
        .force("link", d3.forceLink(g.links).id(function (d) { return d.id; }).distance(50).strength(0.3))
        .force("charge", d3.forceManyBody().strength(-120))
        .force("x", d3.forceX(function (d) {
          var c = clusterCenters[d.group] || clusterCenters[d.type] || { x: cx, y: cy };
          return c.x;
        }).strength(0.55))
        .force("y", d3.forceY(function (d) {
          var c = clusterCenters[d.group] || clusterCenters[d.type] || { x: cx, y: cy };
          return c.y;
        }).strength(0.55))
        .force("collision", d3.forceCollide().radius(function (d) { return (d.radius || 14) + 6; }))
        .alpha(0.8)
        .on("tick", render);

    } else if (layoutName === "hierarchical") {
      var tierMap = { institution: 0, grant: 1, theme: 2, organism: 2, publication: 3, tool: 4 };
      var tiers = [[], [], [], [], []];
      g.nodes.forEach(function (n) {
        var t = tierMap[n.type] !== undefined ? tierMap[n.type] : 2;
        tiers[t].push(n);
      });

      var stepY = height / (tiers.length + 1);
      tiers.forEach(function (tierList, tIdx) {
        var yPos = (tIdx + 1) * stepY;
        var stepX = width / (tierList.length + 1);
        tierList.forEach(function (n, i) {
          n.fx = (i + 1) * stepX;
          n.fy = yPos;
        });
      });

      sim = d3.forceSimulation(g.nodes)
        .force("link", d3.forceLink(g.links).id(function (d) { return d.id; }).strength(0.1))
        .alpha(0.2)
        .on("tick", render);
    }

    if (state.paused && sim) sim.stop();
  }

  // ---- Canvas Renderer ----
  function render() {
    if (!ctx) return;
    var pal = PALETTES[getTheme()];

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply viewport pan and zoom
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    var g = getActiveGraph();
    var activeNeighborIds = (hoveredNode || selectedNode) ? getConnectedNodeIds(hoveredNode || selectedNode) : null;

    // 1. Draw Links
    g.links.forEach(function (l) {
      var s = l.source;
      var t = l.target;
      if (!s.x || !t.x) return;

      var isHighlighted = activeNeighborIds && (
        ((hoveredNode || selectedNode).id === s.id && activeNeighborIds.has(t.id)) ||
        ((hoveredNode || selectedNode).id === t.id && activeNeighborIds.has(s.id))
      );

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);

      if (isHighlighted) {
        ctx.strokeStyle = pal.linkHighlight;
        ctx.lineWidth = pal.linkHighlightWidth / transform.k;
        ctx.globalAlpha = 1.0;
      } else if (activeNeighborIds) {
        ctx.strokeStyle = pal.link;
        ctx.lineWidth = 0.8 / transform.k;
        ctx.globalAlpha = 0.15;
      } else {
        ctx.strokeStyle = pal.link;
        ctx.lineWidth = 1.0 / transform.k;
        ctx.globalAlpha = 0.8;
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // 2. Draw Nodes
    g.nodes.forEach(function (n) {
      if (!n.x) return;
      var r = (n.radius || 14);
      var isNeighbor = !activeNeighborIds || activeNeighborIds.has(n.id);
      var isHover = (hoveredNode && hoveredNode.id === n.id);
      var isSelected = (selectedNode && selectedNode.id === n.id);

      ctx.save();
      if (!isNeighbor) {
        ctx.globalAlpha = 0.18;
      }

      // Draw Selection / Hover Halo
      if (isHover || isSelected) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 7, 0, Math.PI * 2);
        ctx.fillStyle = pal.halo;
        ctx.fill();
        ctx.strokeStyle = pal.linkHighlight;
        ctx.lineWidth = 2 / transform.k;
        ctx.stroke();
      }

      // Draw Node Circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.color || pal.types[n.type] || "#004053";
      ctx.fill();
      ctx.strokeStyle = (getTheme() === "dark") ? "#10262e" : "#ffffff";
      ctx.lineWidth = 2 / transform.k;
      ctx.stroke();

      // Node Icon for themes
      if (n.icon && r >= 20) {
        ctx.font = Math.round(r * 0.9) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.icon, n.x, n.y);
      }

      // Draw Text Labels
      var shouldLabel = (r >= 16) || isHover || isSelected || (transform.k >= 1.2 && r >= 13);
      if (shouldLabel) {
        ctx.font = (isHover || isSelected ? "bold " : "") + (n.type === "theme" ? "12px" : "11px") + ' "IBM Plex Sans", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = pal.text;

        var lbl = n.label;
        if (lbl.length > 28 && !isHover && !isSelected) {
          lbl = lbl.substring(0, 26) + "…";
        }

        // Faint text backdrop for readability
        ctx.strokeStyle = pal.bg;
        ctx.lineWidth = 3 / transform.k;
        ctx.strokeText(lbl, n.x, n.y + r + 3);
        ctx.fillText(lbl, n.x, n.y + r + 3);
      }

      ctx.restore();
    });

    ctx.restore();
  }

  // ---- Coordinate Conversions ----
  function screenToWorld(sx, sy) {
    return {
      x: (sx - transform.x) / transform.k,
      y: (sy - transform.y) / transform.k
    };
  }

  function findNodeAt(sx, sy) {
    var w = screenToWorld(sx, sy);
    var g = getActiveGraph();
    for (var i = g.nodes.length - 1; i >= 0; i--) {
      var n = g.nodes[i];
      var r = (n.radius || 14) + 4;
      var dx = w.x - n.x;
      var dy = w.y - n.y;
      if (dx * dx + dy * dy <= r * r) {
        return n;
      }
    }
    return null;
  }

  // ---- Interaction Events ----
  function setupEvents() {
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Touch support for mobile devices
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    // Zoom Controls Dock
    var btnZoomIn = document.getElementById("btn-zoom-in");
    var btnZoomOut = document.getElementById("btn-zoom-out");
    var btnFit = document.getElementById("btn-fit");
    var btnPause = document.getElementById("btn-pause");
    var layoutSelect = document.getElementById("select-layout");

    if (btnZoomIn) btnZoomIn.addEventListener("click", function () { zoomBy(1.25); });
    if (btnZoomOut) btnZoomOut.addEventListener("click", function () { zoomBy(0.8); });
    if (btnFit) btnFit.addEventListener("click", function () { fitToScreen(true); });
    if (btnPause) {
      btnPause.addEventListener("click", function () {
        state.paused = !state.paused;
        if (state.paused) {
          if (sim) sim.stop();
          btnPause.setAttribute("aria-pressed", "true");
          btnPause.textContent = "▶ Resume";
        } else {
          if (sim) sim.alpha(0.3).restart();
          btnPause.setAttribute("aria-pressed", "false");
          btnPause.textContent = "⏸ Pause";
        }
      });
    }
    if (layoutSelect) {
      layoutSelect.addEventListener("change", function () {
        applyLayout(layoutSelect.value);
        setTimeout(function () { fitToScreen(true); }, 300);
      });
    }

    // Filter Controls
    document.querySelectorAll("[data-filter-type]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        state.types[cb.dataset.filterType] = cb.checked;
        applyLayout(state.layout);
        updateStatsCounter();
      });
    });

    document.querySelectorAll("[data-graph-theme]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.themeFilter = btn.dataset.graphTheme;
        document.querySelectorAll("[data-graph-theme]").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        applyLayout(state.layout);
        updateStatsCounter();
      });
    });

    // Timeline Slider
    var slider = document.getElementById("timeline-slider");
    var sliderVal = document.getElementById("timeline-val");
    if (slider) {
      slider.addEventListener("input", function () {
        state.yearMin = parseInt(slider.value, 10);
        if (sliderVal) sliderVal.textContent = state.yearMin + " – 2026";
        applyLayout(state.layout);
        updateStatsCounter();
      });
    }

    // Search Input
    var searchInput = document.getElementById("graph-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.searchQuery = searchInput.value.trim();
        applyLayout(state.layout);
        updateStatsCounter();

        // Auto-center on top match if available
        if (state.searchQuery.length >= 3) {
          var g = getActiveGraph();
          if (g.nodes.length > 0) {
            focusNode(g.nodes[0]);
          }
        }
      });
    }

    // Close Inspector Drawer
    var drawerClose = document.getElementById("drawer-close");
    if (drawerClose) {
      drawerClose.addEventListener("click", function () {
        closeInspector();
      });
    }

    // Theme Switch listener
    var themeBtn = document.querySelector(".theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        setTimeout(render, 50);
      });
    }
  }

  function onMouseDown(e) {
    var rect = canvas.getBoundingClientRect();
    var sx = e.clientX - rect.left;
    var sy = e.clientY - rect.top;
    var hit = findNodeAt(sx, sy);

    if (hit) {
      draggedNode = hit;
      draggedNode.fx = hit.x;
      draggedNode.fy = hit.y;
      if (sim && !state.paused) sim.alphaTarget(0.3).restart();
    } else {
      isDragging = true;
      dragStart.x = e.clientX - transform.x;
      dragStart.y = e.clientY - transform.y;
    }
  }

  function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    var sx = e.clientX - rect.left;
    var sy = e.clientY - rect.top;

    if (draggedNode) {
      var w = screenToWorld(sx, sy);
      draggedNode.fx = w.x;
      draggedNode.fy = w.y;
      render();
      return;
    }

    if (isDragging) {
      transform.x = e.clientX - dragStart.x;
      transform.y = e.clientY - dragStart.y;
      render();
      return;
    }

    // Hover detection
    var hit = findNodeAt(sx, sy);
    if (hit !== hoveredNode) {
      hoveredNode = hit;
      canvas.style.cursor = hit ? "pointer" : "grab";
      updateTooltip(hit, e.clientX, e.clientY);
      render();
    } else if (hoveredNode) {
      updateTooltip(hoveredNode, e.clientX, e.clientY);
    }
  }

  function onMouseUp(e) {
    var rect = canvas.getBoundingClientRect();
    var sx = e.clientX - rect.left;
    var sy = e.clientY - rect.top;

    if (draggedNode) {
      if (state.layout !== "concentric" && state.layout !== "hierarchical") {
        draggedNode.fx = null;
        draggedNode.fy = null;
      }
      if (sim && !state.paused) sim.alphaTarget(0);
      draggedNode = null;
    }

    if (!isDragging) {
      var hit = findNodeAt(sx, sy);
      if (hit) {
        selectNode(hit);
      }
    }
    isDragging = false;
  }

  function onWheel(e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var sx = e.clientX - rect.left;
    var sy = e.clientY - rect.top;

    var factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomAt(sx, sy, factor);
  }

  function zoomBy(factor) {
    zoomAt(width / 2, height / 2, factor);
  }

  function zoomAt(sx, sy, factor) {
    var newK = Math.max(0.18, Math.min(4.5, transform.k * factor));
    var wx = (sx - transform.x) / transform.k;
    var wy = (sy - transform.y) / transform.k;

    transform.k = newK;
    transform.x = sx - wx * transform.k;
    transform.y = sy - wy * transform.k;
    render();
  }

  // ---- Touch support ----
  var touchDist = 0;
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      var t = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var sx = t.clientX - rect.left;
      var sy = t.clientY - rect.top;
      var hit = findNodeAt(sx, sy);
      if (hit) {
        draggedNode = hit;
        draggedNode.fx = hit.x;
        draggedNode.fy = hit.y;
      } else {
        isDragging = true;
        dragStart.x = t.clientX - transform.x;
        dragStart.y = t.clientY - transform.y;
      }
    } else if (e.touches.length === 2) {
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      var t = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var sx = t.clientX - rect.left;
      var sy = t.clientY - rect.top;
      if (draggedNode) {
        var w = screenToWorld(sx, sy);
        draggedNode.fx = w.x;
        draggedNode.fy = w.y;
        render();
      } else if (isDragging) {
        transform.x = t.clientX - dragStart.x;
        transform.y = t.clientY - dragStart.y;
        render();
      }
    } else if (e.touches.length === 2) {
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (touchDist > 0) {
        var midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        var midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomAt(midX, midY, dist / touchDist);
      }
      touchDist = dist;
    }
  }

  function onTouchEnd(e) {
    if (draggedNode) {
      draggedNode.fx = null;
      draggedNode.fy = null;
      draggedNode = null;
    }
    isDragging = false;
    touchDist = 0;
  }

  // ---- Fit to Screen ----
  function fitToScreen(animated) {
    var g = getActiveGraph();
    if (g.nodes.length === 0) return;

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    g.nodes.forEach(function (n) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    var graphW = (maxX - minX) + 120;
    var graphH = (maxY - minY) + 120;
    var scale = Math.min(width / graphW, height / graphH, 1.4);
    scale = Math.max(0.25, Math.min(scale, 1.8));

    var targetX = width / 2 - ((minX + maxX) / 2) * scale;
    var targetY = height / 2 - ((minY + maxY) / 2) * scale;

    transform.k = scale;
    transform.x = targetX;
    transform.y = targetY;
    render();
  }

  function focusNode(node) {
    if (!node) return;
    transform.k = 1.35;
    transform.x = width / 2 - node.x * transform.k;
    transform.y = height / 2 - node.y * transform.k;
    selectedNode = node;
    render();
    openInspector(node);
  }

  // ---- Tooltip (Hover) ----
  function updateTooltip(node, mouseX, mouseY) {
    var tooltip = document.getElementById("graph-tooltip");
    if (!tooltip) return;

    if (!node) {
      tooltip.style.display = "none";
      return;
    }

    var badge = node.type.toUpperCase();
    if (node.year) badge += " · " + node.year;
    if (node.badge) badge += " · " + node.badge;

    tooltip.innerHTML =
      '<div class="tt-type">' + badge + '</div>' +
      '<div class="tt-title">' + node.label + '</div>' +
      (node.venue ? '<div class="tt-venue">' + node.venue + '</div>' : '') +
      '<div class="tt-meta">' + (node.degree || 0) + ' connections · Click to inspect</div>';

    tooltip.style.display = "block";

    var ttW = tooltip.offsetWidth || 240;
    var ttH = tooltip.offsetHeight || 80;
    var posX = mouseX + 16;
    var posY = mouseY + 16;

    if (posX + ttW > window.innerWidth - 20) posX = mouseX - ttW - 16;
    if (posY + ttH > window.innerHeight - 20) posY = mouseY - ttH - 16;

    tooltip.style.left = posX + "px";
    tooltip.style.top = posY + "px";
  }

  // ---- Inspector Side Drawer (Click) ----
  function selectNode(node) {
    selectedNode = node;
    render();
    openInspector(node);
  }

  function openInspector(node) {
    var drawer = document.getElementById("graph-drawer");
    if (!drawer) return;

    document.getElementById("drawer-title").textContent = node.label;
    document.getElementById("drawer-type").textContent = node.type.toUpperCase() + (node.year ? " (" + node.year + ")" : "");
    document.getElementById("drawer-desc").textContent = node.description || node.summary || "No description provided.";

    // Action buttons
    var actionsEl = document.getElementById("drawer-actions");
    actionsEl.innerHTML = "";

    if (node.url || node.doi) {
      var linkUrl = node.url || ("https://doi.org/" + node.doi);
      var btnDoi = document.createElement("a");
      btnDoi.className = "btn primary";
      btnDoi.href = linkUrl;
      btnDoi.target = "_blank";
      btnDoi.rel = "noopener";
      btnDoi.innerHTML = "<span>Read Paper / Resource ↗</span>";
      actionsEl.appendChild(btnDoi);
    }
    if (node.demo_url) {
      var btnDemo = document.createElement("a");
      btnDemo.className = "btn primary";
      btnDemo.href = node.demo_url;
      btnDemo.target = "_blank";
      btnDemo.rel = "noopener";
      btnDemo.innerHTML = "<span>Launch Live Tool ↗</span>";
      actionsEl.appendChild(btnDemo);
    }
    if (node.repo) {
      var btnRepo = document.createElement("a");
      btnRepo.className = "btn";
      btnRepo.href = "https://github.com/" + node.repo;
      btnRepo.target = "_blank";
      btnRepo.rel = "noopener";
      btnRepo.innerHTML = "<span>GitHub Source</span>";
      actionsEl.appendChild(btnRepo);
    }

    // Neighbors list
    var neighborsEl = document.getElementById("drawer-neighbors");
    neighborsEl.innerHTML = "";

    var neighborIds = getConnectedNodeIds(node);
    neighborIds.delete(node.id);

    if (neighborIds.size === 0) {
      neighborsEl.innerHTML = '<li class="note">No direct neighbors found.</li>';
    } else {
      var g = getActiveGraph();
      var nodeMap = {};
      rawData.nodes.forEach(function (n) { nodeMap[n.id] = n; });

      neighborIds.forEach(function (nid) {
        var n = nodeMap[nid];
        if (!n) return;
        var li = document.createElement("li");
        li.className = "neighbor-item";
        li.innerHTML =
          '<span class="chip ' + (n.type === "tool" ? "leaf" : "") + '">' + n.type + '</span> ' +
          '<strong>' + n.label + '</strong>';
        li.addEventListener("click", function () {
          focusNode(n);
        });
        neighborsEl.appendChild(li);
      });
    }

    drawer.classList.add("open");
  }

  function closeInspector() {
    var drawer = document.getElementById("graph-drawer");
    if (drawer) drawer.classList.remove("open");
    selectedNode = null;
    render();
  }

  function updateStatsCounter() {
    var g = getActiveGraph();
    var countEl = document.getElementById("graph-node-count");
    if (countEl) {
      countEl.textContent = g.nodes.length + " nodes · " + g.links.length + " connections";
    }
  }

  // Initialize on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", function () {
    if (initCanvas()) {
      loadGraphData();
    }
  });

})();
