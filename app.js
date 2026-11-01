(function () {
  const E = window.ELECTION;

  const NAMES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
    CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
    KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
    MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
    NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
    NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
    OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
    TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
    WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
  };
  const ABBR = Object.fromEntries(Object.entries(NAMES).map(([k, v]) => [v, k]));

  const RATINGS = [
    { key: "SD", label: "Solid D", color: "var(--d3)", text: "light" },
    { key: "LkD", label: "Likely D", color: "var(--d2)", text: "light" },
    { key: "LD", label: "Lean D", color: "var(--d1)", text: "dark" },
    { key: "TU", label: "Toss Up", color: "var(--tu)", text: "dark" },
    { key: "LR", label: "Lean R", color: "var(--r1)", text: "dark" },
    { key: "LkR", label: "Likely R", color: "var(--r2)", text: "light" },
    { key: "SR", label: "Solid R", color: "var(--r3)", text: "light" }
  ];
  const R = Object.fromEntries(RATINGS.map(r => [r.key, r]));
  const PARTY = { D: "var(--d3)", R: "var(--r3)", I: "var(--ind)" };

  // Small northeastern states get a labeled box beside the map instead of a centroid label.
  const CALLOUTS = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD"];
  const LABEL_NUDGE = { FL: [12, 8], MI: [10, 22], LA: [-10, 0], KY: [6, 2], CA: [-8, 0], ID: [0, 16], HI: [0, 0], WV: [-3, 4], VA: [8, 2], NY: [6, 0], MN: [-6, 0] };

  let chamber = "senate";
  let pinned = null;

  // A race's map category: the call if there is one, then who leads the count, then the rating.
  function category(race) {
    const res = race.result;
    if (res && res.called) return res.called === "D" ? "SD" : res.called === "R" ? "SR" : "TU";
    if (res && res.reporting > 0) {
      const lead = res.d > res.r ? "D" : "R";
      return lead === "D" ? "LD" : "LR";
    }
    return race.rating;
  }
  const hasResults = () => Object.values(E[chamber].races).some(r => r.result && r.result.reporting > 0);

  // ---------- Map ----------
  const svg = d3.select("#map");
  const gStates = svg.append("g");
  const gLabels = svg.append("g");
  const gCallouts = svg.append("g");
  const hl = svg.append("path").attr("class", "hl");
  const path = d3.geoPath();
  let features = [];

  fetch("states-albers-10m.json")
    .then(r => r.json())
    .then(topo => {
      features = topojson.feature(topo, topo.objects.states).features
        .map(f => Object.assign(f, { abbr: ABBR[f.properties.name] }))
        .filter(f => f.abbr && f.abbr !== "DC");
      drawMap();
      render();
    });

  function drawMap() {
    gStates.selectAll("path")
      .data(features, d => d.abbr)
      .join("path")
      .attr("class", "state")
      .attr("d", path)
      .on("pointerenter", (ev, d) => ev.pointerType === "mouse" && hover(d.abbr, ev))
      .on("pointermove", (ev, d) => ev.pointerType === "mouse" && hover(d.abbr, ev))
      .on("pointerleave", (ev) => ev.pointerType === "mouse" && !pinned && hideTip())
      .on("click", (ev, d) => pin(d.abbr, ev));

    const labeled = features.filter(f => !CALLOUTS.includes(f.abbr));
    gLabels.selectAll("text")
      .data(labeled, d => d.abbr)
      .join("text")
      .attr("class", "lbl")
      .attr("transform", d => {
        const [x, y] = path.centroid(d);
        const [dx, dy] = LABEL_NUDGE[d.abbr] || [0, 0];
        return `translate(${x + dx},${y + dy})`;
      })
      .text(d => d.abbr);

    const byAbbr = Object.fromEntries(features.map(f => [f.abbr, f]));
    const boxX = 990, top = 150, step = 30;
    const g = gCallouts.selectAll("g")
      .data(CALLOUTS)
      .join("g")
      .attr("class", "callout")
      .on("pointerenter", (ev, a) => ev.pointerType === "mouse" && hover(a, ev))
      .on("pointermove", (ev, a) => ev.pointerType === "mouse" && hover(a, ev))
      .on("pointerleave", (ev) => ev.pointerType === "mouse" && !pinned && hideTip())
      .on("click", (ev, a) => pin(a, ev));
    g.append("line")
      .attr("x1", a => path.centroid(byAbbr[a])[0])
      .attr("y1", a => path.centroid(byAbbr[a])[1])
      .attr("x2", boxX)
      .attr("y2", (a, i) => top + i * step + 11);
    g.append("rect")
      .attr("x", boxX).attr("y", (a, i) => top + i * step)
      .attr("width", 44).attr("height", 22).attr("rx", 4);
    g.append("text")
      .attr("class", "lbl")
      .attr("x", boxX + 22).attr("y", (a, i) => top + i * step + 11)
      .text(a => a);
  }

  function fillFor(abbr) {
    const race = E[chamber].races[abbr];
    if (!race) return null;
    return R[category(race)];
  }

  function render() {
    const C = E[chamber];
    document.querySelectorAll(".tabs button").forEach(b =>
      b.setAttribute("aria-selected", String(b.dataset.chamber === chamber)));

    const n = Object.keys(C.races).length;
    document.getElementById("map-title").textContent = chamber === "senate" ? "Senate races" : "Governor races";
    document.getElementById("map-sub").textContent = hasResults()
      ? `${n} races on the ballot. States with votes counted are colored by who leads; called races are solid.`
      : `${n} races on the ballot Tuesday, colored by Cook Political Report rating. Hover or tap a state for the matchup.`;

    gStates.selectAll("path")
      .attr("class", d => "state" + (C.races[d.abbr] ? "" : " none"))
      .style("fill", d => { const r = fillFor(d.abbr); return r ? r.color : null; });

    gLabels.selectAll("text")
      .attr("class", d => { const r = fillFor(d.abbr); return "lbl " + (r ? r.text : "off"); });

    gCallouts.selectAll("g")
      .attr("class", a => "callout" + (C.races[a] ? "" : " none"))
      .each(function (a) {
        const r = fillFor(a);
        d3.select(this).select("rect").style("fill", r ? r.color : null);
        d3.select(this).select("text").attr("class", "lbl " + (r ? r.text : "off"));
      });

    renderLegend();
    renderTally();
    renderWatch();
    hideTip();
  }

  function renderLegend() {
    const races = Object.values(E[chamber].races);
    const counts = {};
    races.forEach(r => { const c = category(r); counts[c] = (counts[c] || 0) + 1; });
    const items = RATINGS.map(r =>
      `<li><i style="background:${r.color}"></i>${r.label} <b>${counts[r.key] || 0}</b></li>`);
    items.push(`<li><i style="background:var(--empty)"></i>No race</li>`);
    document.getElementById("legend").innerHTML = items.join("");
  }

  function renderTally() {
    const C = E[chamber];
    const sum = { SD: 0, LkD: 0, LD: 0, TU: 0, LR: 0, LkR: 0, SR: 0 };
    Object.values(C.races).forEach(r => sum[category(r)]++);
    const d = C.holdover.D + sum.SD + sum.LkD + sum.LD;
    const r = C.holdover.R + sum.SR + sum.LkR + sum.LR;
    const total = C.holdover.D + C.holdover.R + Object.keys(C.races).length;
    const unit = chamber === "senate" ? "seats" : "governorships";

    document.getElementById("tally").innerHTML = `
      <div class="side-d"><span class="num">${d}</span><span class="who">Democrats</span></div>
      <div class="mid"><b>${sum.TU}</b>toss ups</div>
      <div class="side-r"><span class="num">${r}</span><span class="who">Republicans</span></div>`;

    const segs = [
      ["hold-d", C.holdover.D, null], ["", sum.SD, "SD"], ["", sum.LkD, "LkD"], ["", sum.LD, "LD"],
      ["", sum.TU, "TU"], ["", sum.LR, "LR"], ["", sum.LkR, "LkR"], ["", sum.SR, "SR"], ["hold-r", C.holdover.R, null]
    ];
    const bar = document.getElementById("bar");
    bar.innerHTML = segs.map(([cls, n, k]) =>
      `<span class="${cls}" style="width:${(n / total) * 100}%;${k ? `background:${R[k].color}` : ""}"></span>`).join("") +
      `<i class="bar-mark" style="left:calc(${(C.majority / total) * 100}% - 1px)"></i>`;

    const note = chamber === "senate"
      ? `Includes ${C.holdover.D} Democratic and ${C.holdover.R} Republican seats not up this year (the two independents caucus with Democrats). Democrats need 51 seats for control, a net gain of 4; Republicans keep it at 50 with the vice president's tiebreak.`
      : `Includes ${C.holdover.D} Democratic and ${C.holdover.R} Republican governors not up this year. Republicans hold 26 governorships today, Democrats 24.`;
    document.getElementById("bar-note").textContent = `Counts ${unit} at least leaning to each party. ` + note;
  }

  const ORDER = { TU: 0, LD: 1, LR: 1, LkD: 2, LkR: 2 };
  function renderWatch() {
    const races = E[chamber].races;
    const list = Object.keys(races)
      .filter(a => races[a].rating in ORDER)
      .sort((a, b) => ORDER[races[a].rating] - ORDER[races[b].rating] || NAMES[a].localeCompare(NAMES[b]));
    const ol = document.getElementById("watch");
    ol.innerHTML = list.map(a => {
      const x = races[a], rt = R[category(x)];
      const left = x.d || x.i, right = x.r;
      return `<li data-abbr="${a}" tabindex="0">
        <span class="ab">${a}</span>
        <span class="m">${last(left)}<span class="vs">v</span>${last(right)}</span>
        <span class="pill" style="background:${rt.color};color:${rt.text === "light" ? "#f4f6f9" : "#12151a"}">${rt.label}</span>
      </li>`;
    }).join("");

    ol.querySelectorAll("li").forEach(li => {
      const a = li.dataset.abbr;
      li.addEventListener("mouseenter", () => focusState(a));
      li.addEventListener("mouseleave", () => { if (!pinned) unfocus(); });
      li.addEventListener("click", ev => pin(a, ev, li));
      li.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pin(a, ev, li); } });
    });
  }
  const last = name => name ? name.replace(/ (Jr\.|Sr\.|III)$/, "").split(" ").slice(-1)[0] : "–";

  function focusState(a) {
    const f = features.find(x => x.abbr === a);
    if (!f) return;
    hl.attr("d", path(f)).raise();
    gStates.selectAll("path").classed("dim", d => d.abbr !== a && !!E[chamber].races[d.abbr]);
  }
  function unfocus() {
    hl.attr("d", null);
    gStates.selectAll("path").classed("dim", false);
  }

  // ---------- Tooltip ----------
  const tip = document.getElementById("tip");

  function tipHTML(a) {
    const race = E[chamber].races[a];
    const office = chamber === "senate" ? "Senate" : "Governor";
    if (!race) {
      const held = chamber === "governor" && E.governor.holdoverStates[a];
      return `<button class="tip-close" aria-label="Close">×</button>
        <div class="tip-head"><h3>${NAMES[a]}</h3></div>
        <p class="muted" style="margin:8px 0 0">No ${office.toLowerCase()} race this year${held ? `. Current governor: ${held === "D" ? "Democrat" : "Republican"}.` : "."}</p>`;
    }
    const rt = R[race.rating];
    const kind = [office, race.special ? "special" : null, race.open ? "open seat" : null].filter(Boolean).join(" · ");
    const res = race.result;

    const cands = [["D", race.d], ["R", race.r], ["I", race.i]].filter(([, n]) => n);
    const rows = cands.map(([p, n]) => {
      const pct = res ? res[p.toLowerCase()] : null;
      const won = res && res.called === p ? " ✓" : "";
      return `<li>
        <span class="chip" style="background:${PARTY[p]}">${p}</span>
        <span>${n}${race.inc === p ? ' <span class="inc">incumbent</span>' : ""}${won}</span>
        <span class="pct">${pct != null ? pct.toFixed(1) + "%" : ""}</span>
        ${pct != null ? `<span class="vbar" style="width:${pct}%;background:${PARTY[p]}"></span>` : ""}
      </li>`;
    }).join("");

    const flip = rt && race.held && ((race.held === "R" && rt.key.endsWith("D")) || (race.held === "D" && rt.key.endsWith("R")));
    return `<button class="tip-close" aria-label="Close">×</button>
      <div class="tip-head"><h3>${NAMES[a]}</h3><span class="tip-kind">${kind}</span></div>
      <span class="pill" style="background:${rt.color};color:${rt.text === "light" ? "#f4f6f9" : "#12151a"}">${rt.label}${flip ? " · flip" : ""}</span>
      <ul class="cands">${rows}</ul>
      ${res ? `<div class="tip-sec"><p>${res.reporting}% of expected vote counted${res.called ? "" : ". Not yet called."}</p></div>` : ""}
      ${race.poll ? `<div class="tip-sec"><h4 class="eyebrow">Polling</h4><p>${race.poll}</p></div>` : ""}
      ${race.note ? `<div class="tip-sec"><p class="muted">${race.note}</p></div>` : ""}
      <div class="tip-src">Seat held by ${race.held === "D" ? "Democrats" : "Republicans"} · rating from Cook</div>`;
  }

  function hover(a, ev) {
    if (pinned) return;
    tip.innerHTML = tipHTML(a);
    tip.classList.remove("sheet");
    tip.hidden = false;
    place(ev.clientX, ev.clientY);
    if (E[chamber].races[a]) focusState(a); else unfocus();
  }

  function place(x, y) {
    const w = tip.offsetWidth, h = tip.offsetHeight, pad = 16;
    let left = x + pad, top = y + pad;
    if (left + w > innerWidth - 8) left = x - w - pad;
    if (top + h > innerHeight - 8) top = Math.max(8, innerHeight - h - 8);
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = top + "px";
  }

  function pin(a, ev, row) {
    ev.stopPropagation();
    if (pinned === a) { unpin(); return; }
    pinned = a;
    tip.innerHTML = tipHTML(a);
    tip.hidden = false;
    const touch = ev.pointerType && ev.pointerType !== "mouse";
    if (touch || innerWidth < 700 || row) {
      tip.classList.add("sheet");
      tip.style.left = ""; tip.style.top = "";
    } else {
      tip.classList.remove("sheet");
      place(ev.clientX, ev.clientY);
    }
    tip.querySelector(".tip-close").addEventListener("click", e => { e.stopPropagation(); unpin(); });
    document.querySelectorAll(".watch li").forEach(li => li.classList.toggle("on", li.dataset.abbr === a));
    if (E[chamber].races[a]) focusState(a); else unfocus();
  }
  function unpin() {
    pinned = null;
    hideTip();
  }
  function hideTip() {
    tip.hidden = true;
    unfocus();
    document.querySelectorAll(".watch li.on").forEach(li => li.classList.remove("on"));
  }
  document.addEventListener("click", ev => { if (pinned && !tip.contains(ev.target)) unpin(); });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") unpin(); });

  // ---------- Tabs ----------
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
    chamber = b.dataset.chamber;
    pinned = null;
    try { localStorage.setItem("chamber", chamber); } catch (e) {}
    render();
  }));
  try {
    const saved = localStorage.getItem("chamber");
    if (saved === "governor" || saved === "senate") chamber = saved;
  } catch (e) {}

  // ---------- Countdown ----------
  const closeAt = new Date(E.firstPollsClose).getTime();
  function tick() {
    const ms = closeAt - Date.now();
    const label = document.getElementById("clock-label");
    const value = document.getElementById("clock-value");
    if (ms <= 0) {
      label.textContent = "Election night";
      value.textContent = hasResults() ? "Results coming in" : "Polls closing";
      return;
    }
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    const p = n => String(n).padStart(2, "0");
    value.textContent = `${d}d ${p(h)}h ${p(m)}m ${p(sec)}s`;
  }
  tick();
  setInterval(tick, 1000);

  const up = new Date(E.updated + "T12:00:00");
  document.getElementById("updated").textContent =
    "Last updated " + up.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + ".";
})();
