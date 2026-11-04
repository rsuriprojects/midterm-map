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
      const d = res.d || 0, r = res.r || 0, i = res.i || 0;
      if (i > d && i > r) return "TU"; // an independent leads (Nebraska, Idaho, South Dakota)
      return d > r ? "LD" : "LR";
    }
    return race.rating;
  }
  const hasResults = () => chamber === "house"
    ? H.called.D + H.called.R > 0 || H.districts.some(d => d[5] && d[5].reporting > 0)
    : Object.values(E[chamber].races).some(r => r.result && r.result.reporting > 0);

  // The House map shades each state by how many toss up or lean seats it has.
  const H = E.house;
  const COMPETITIVE = ["TU", "LD", "LR"];
  const distsIn = a => H.districts.filter(d => d[0].startsWith(a + "-"));
  const competitiveIn = a => distsIn(a).filter(d => COMPETITIVE.includes(d[3])).length;
  const HOUSE_STEPS = [
    { min: 5, label: "5+", color: "var(--h4)", text: "dark" },
    { min: 3, label: "3–4", color: "var(--h3)", text: "dark" },
    { min: 2, label: "2", color: "var(--h2)", text: "light" },
    { min: 1, label: "1", color: "var(--h1)", text: "light" }
  ];
  const hasRace = a => chamber === "house" || !!E[chamber].races[a];

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
    // Striped fills for races that are leading but not called yet
    const defs = svg.insert("defs", ":first-child");
    Object.entries({ D: "var(--d2)", R: "var(--r2)", I: "var(--ind)" }).forEach(([p, c]) => {
      const pt = defs.append("pattern").attr("id", "lead-" + p)
        .attr("width", 8).attr("height", 8).attr("patternUnits", "userSpaceOnUse")
        .attr("patternTransform", "rotate(45)");
      pt.append("rect").attr("width", 8).attr("height", 8).style("fill", "var(--pending)");
      pt.append("rect").attr("width", 4.5).attr("height", 8).style("fill", c);
    });

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

  // "Called races only" view: color only races a network has projected.
  let calledOnly = false;
  const PENDING = { color: "var(--pending)", text: "off" };
  const SOLID = { D: "var(--d3)", R: "var(--r3)", I: "var(--ind)" };
  const PARTY_WORD = { D: "Dem", R: "GOP", I: "Ind" };

  // Election-night status of a Senate or governor race: called, leading in the count, or no votes yet.
  function statusOf(race) {
    const res = race.result;
    if (res && res.called) return { kind: "called", p: res.called };
    if (res && res.reporting > 0) {
      const d = res.d || 0, r = res.r || 0, i = res.i || 0;
      const p = i > d && i > r ? "I" : d > r ? "D" : "R";
      const sorted = [d, r, i].sort((x, y) => y - x);
      return { kind: "lead", p, by: sorted[0] - sorted[1], reporting: res.reporting };
    }
    return { kind: "waiting" };
  }
  const resultsMode = () => chamber !== "house" && hasResults();
  const calledKey = race => {
    const st = statusOf(race);
    return st.kind === "called" ? st.p : null;
  };

  function fillFor(abbr) {
    if (chamber === "house") {
      const n = competitiveIn(abbr);
      return HOUSE_STEPS.find(s => n >= s.min) || null;
    }
    const race = E[chamber].races[abbr];
    if (!race) return null;
    const st = statusOf(race);
    if (st.kind === "called") return { color: SOLID[st.p], text: "light", mark: true };
    if (calledOnly) return PENDING;
    if (resultsMode()) return st.kind === "lead" ? { color: `url(#lead-${st.p})`, text: "light" } : PENDING;
    return R[category(race)];
  }

  function render() {
    const C = E[chamber];
    document.querySelectorAll(".tabs button").forEach(b =>
      b.setAttribute("aria-selected", String(b.dataset.chamber === chamber)));

    document.getElementById("map-title").textContent =
      { senate: "Senate races", house: "House races", governor: "Governor races" }[chamber];
    if (chamber === "house") {
      const close = H.districts.filter(d => COMPETITIVE.includes(d[3])).length;
      document.getElementById("map-sub").textContent =
        `All 435 seats are on the ballot. ${close} are toss ups or leaning, and the map shades each state by how many it has. Hover or tap a state for its close districts.`;
    } else {
      const n = Object.keys(C.races).length;
      document.getElementById("map-sub").textContent = hasResults()
        ? `${n} races on the ballot. Solid with a ✓ means a network has called the race. Striped means one side leads but it isn't called yet. Gray means no votes counted.`
        : `${n} races on the ballot Tuesday, colored by Cook Political Report rating. Hover or tap a state for the matchup.`;
    }

    gStates.selectAll("path")
      .attr("class", d => "state" + (fillFor(d.abbr) ? "" : " none"))
      .style("fill", d => { const r = fillFor(d.abbr); return r ? r.color : null; });

    const labelText = a => { const r = fillFor(a); return a + (r && r.mark ? " ✓" : ""); };
    gLabels.selectAll("text")
      .attr("class", d => { const r = fillFor(d.abbr); return "lbl " + (r ? r.text : "off"); })
      .text(d => labelText(d.abbr));

    gCallouts.selectAll("g")
      .attr("class", a => "callout" + (fillFor(a) ? "" : " none"))
      .each(function (a) {
        const r = fillFor(a);
        d3.select(this).select("rect").style("fill", r ? r.color : null);
        d3.select(this).select("text").attr("class", "lbl " + (r ? r.text : "off")).text(labelText(a));
      });

    document.getElementById("called-wrap").hidden = chamber === "house" || !hasResults();
    renderStatus();
    renderLegend();
    renderTally();
    renderWatch();
    hideTip();
  }

  function renderLegend() {
    if (chamber === "house") {
      const counts = HOUSE_STEPS.map(s => Object.keys(H.seats).filter(a => fillFor(a) === s).length);
      const items = HOUSE_STEPS.slice().reverse().map((s, i) =>
        `<li><i style="background:${s.color}"></i>${s.label} close seat${s.min > 1 ? "s" : ""} <b>${counts[HOUSE_STEPS.length - 1 - i]}</b></li>`);
      items.unshift(`<li><i style="background:var(--empty)"></i>None</li>`);
      document.getElementById("legend").innerHTML = items.join("");
      return;
    }
    const races = Object.values(E[chamber].races);
    if (calledOnly || resultsMode()) {
      const n = (kind, p) => races.filter(r => { const s = statusOf(r); return s.kind === kind && (!p || s.p === p); }).length;
      const item = (cls, label, count, always) => (always || count)
        ? `<li><i class="${cls}"></i>${label} <b>${count}</b></li>` : "";
      document.getElementById("legend").innerHTML = calledOnly ? [
        item("sw-called-D", "✓ Called D", n("called", "D"), true),
        item("sw-called-R", "✓ Called R", n("called", "R"), true),
        item("sw-called-I", "✓ Called independent", n("called", "I")),
        item("sw-wait", "Not called yet", races.length - n("called"), true),
        `<li><i class="sw-none"></i>No race</li>`
      ].join("") : [
        item("sw-called-D", "✓ Called D", n("called", "D"), true),
        item("sw-lead-D", "Leading D", n("lead", "D"), true),
        item("sw-lead-I", "Leading independent", n("lead", "I")),
        item("sw-lead-R", "Leading R", n("lead", "R"), true),
        item("sw-called-R", "✓ Called R", n("called", "R"), true),
        item("sw-wait", "No votes yet", n("waiting"), true),
        `<li><i class="sw-none"></i>No race</li>`
      ].join("");
      return;
    }
    const counts = {};
    races.forEach(r => { const c = category(r); counts[c] = (counts[c] || 0) + 1; });
    const items = RATINGS.map(r =>
      `<li><i style="background:${r.color}"></i>${r.label} <b>${counts[r.key] || 0}</b></li>`);
    items.push(`<li><i style="background:var(--empty)"></i>No race</li>`);
    document.getElementById("legend").innerHTML = items.join("");
  }

  function renderHouseTally() {
    const total = 435, called = H.called.D + H.called.R;
    const tally = document.getElementById("tally");
    const bar = document.getElementById("bar");
    const mark = `<i class="bar-mark" style="left:calc(${(H.majority / total) * 100}% - 1px)"></i>`;

    if (called > 0) {
      tally.innerHTML = `
        <div class="side-d"><span class="num">${H.called.D}</span><span class="who">Democrats</span></div>
        <div class="mid"><b>${total - called}</b>not called</div>
        <div class="side-r"><span class="num">${H.called.R}</span><span class="who">Republicans</span></div>`;
      bar.innerHTML =
        `<span style="width:${H.called.D / total * 100}%;background:var(--d3)"></span>` +
        `<span style="width:${(total - called) / total * 100}%"></span>` +
        `<span style="width:${H.called.R / total * 100}%;background:var(--r3)"></span>` + mark;
      const pr = H.projected;
      document.getElementById("bar-note").textContent = pr
        ? `${pr.by} projects ${pr.party === "D" ? "Democrats" : "Republicans"} win control of the House` +
          (pr.estimate ? `, with an estimated ${pr.estimate.D}–${pr.estimate.R} final split. ` : ". ") +
          `Shown above: seats called so far. A party needs ${H.majority}.`
        : `Seats called so far. A party needs ${H.majority} for control.`;
      return;
    }

    const sum = { LkD: 0, LD: 0, TU: 0, LR: 0, LkR: 0 };
    H.districts.forEach(d => { if (d[3] in sum) sum[d[3]]++; });
    sum.SD = H.leaning.D - sum.LkD - sum.LD;
    sum.SR = H.leaning.R - sum.LkR - sum.LR;
    tally.innerHTML = `
      <div class="side-d"><span class="num">${H.leaning.D}</span><span class="who">Democrats</span></div>
      <div class="mid"><b>${sum.TU}</b>toss ups</div>
      <div class="side-r"><span class="num">${H.leaning.R}</span><span class="who">Republicans</span></div>`;
    bar.innerHTML = RATINGS.map(r =>
      `<span style="width:${sum[r.key] / total * 100}%;background:${r.color}"></span>`).join("") + mark;
    document.getElementById("bar-note").textContent =
      `Counts seats at least leaning to each party. Republicans hold the House now; a party needs ${H.majority} of 435 seats for control, and Cook has Democrats at ${H.leaning.D} before any toss ups.`;
  }

  function renderTally() {
    if (chamber === "house") return renderHouseTally();
    if (calledOnly || resultsMode()) return renderCalledTally();
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

  // Election-night tally: the big numbers count only called races (plus seats not up);
  // races that are only leading show as stripes and a "+N leading" note.
  function renderCalledTally() {
    const C = E[chamber], races = Object.values(C.races);
    const n = (kind, p) => races.filter(r => { const s = statusOf(r); return s.kind === kind && (!p || s.p === p); }).length;
    const cd = n("called", "D"), cr = n("called", "R"), ci = n("called", "I");
    const showLeads = !calledOnly;
    const ld = showLeads ? n("lead", "D") : 0, lr = showLeads ? n("lead", "R") : 0, li = showLeads ? n("lead", "I") : 0;
    const open = races.length - cd - cr - ci;
    const total = C.holdover.D + C.holdover.R + races.length;
    const d = C.holdover.D + cd, r = C.holdover.R + cr;
    const leadNote = k => k ? `<span class="lead-note">+${k} leading</span>` : "";
    document.getElementById("tally").innerHTML = `
      <div class="side-d"><span class="num">${d}</span><span class="who">Democrats ${leadNote(ld)}</span></div>
      <div class="mid"><b>${open}</b>not called</div>
      <div class="side-r"><span class="num">${r}</span><span class="who">${leadNote(lr)} Republicans</span></div>`;
    const seg = (k, cls, bg) => `<span class="${cls}" style="width:${k / total * 100}%;${bg ? `background:${bg}` : ""}"></span>`;
    document.getElementById("bar").innerHTML =
      seg(C.holdover.D, "hold-d") + seg(cd, "", "var(--d3)") + seg(ld, "sw-lead-D") +
      seg(ci, "", "var(--ind)") + seg(li, "sw-lead-I") + seg(open - ld - lr - li, "", "var(--pending)") +
      seg(lr, "sw-lead-R") + seg(cr, "", "var(--r3)") + seg(C.holdover.R, "hold-r") +
      `<i class="bar-mark" style="left:calc(${(C.majority / total) * 100}% - 1px)"></i>`;
    const unit = chamber === "senate" ? "seats" : "governorships";
    const sp = chamber === "senate" && C.projected;
    document.getElementById("bar-note").textContent =
      (sp ? `${sp.by} projects ${sp.party === "D" ? "Democrats" : "Republicans"} win control of the Senate. ` : "") +
      `Big numbers count only called races, plus the ${C.holdover.D} Democratic and ${C.holdover.R} Republican ${unit} not up this year.` +
      (showLeads ? " Striped parts of the bar are races one side leads but nobody has called." : "") +
      (chamber === "senate" ? " Democrats need 51 for control; Republicans need 50." : "");
  }

  const ORDER = { TU: 0, LD: 1, LR: 1, LkD: 2, LkR: 2 };
  function pillHTML(key) {
    const rt = R[key];
    return `<span class="pill" style="background:${rt.color};color:${rt.text === "light" ? "#f4f6f9" : "#12151a"}">${rt.label}</span>`;
  }

  function renderWatch() {
    const ol = document.getElementById("watch");
    if (chamber === "house") {
      ol.innerHTML = H.districts.filter(d => d[3] === "TU").map(d =>
        `<li data-abbr="${d[0].slice(0, 2)}" tabindex="0">
          <span class="ab">${d[0].slice(0, 2)}</span>
          <span class="m">${d[0]}<span class="vs">·</span>${d[2] ? last(d[2]) + ` (${d[1]})` : d[4]}</span>
          ${pillHTML(d[3])}
        </li>`).join("");
    } else {
    const races = E[chamber].races;
    const live = hasResults();
    const STATUS_RANK = { lead: 0, waiting: 1, called: 2 };
    const list = Object.keys(races)
      .filter(a => races[a].rating in ORDER)
      .sort((a, b) => (live ? STATUS_RANK[statusOf(races[a]).kind] - STATUS_RANK[statusOf(races[b]).kind] : 0) ||
        ORDER[races[a].rating] - ORDER[races[b].rating] || NAMES[a].localeCompare(NAMES[b]));
    ol.innerHTML = list.map(a => {
      const x = races[a], rt = R[category(x)];
      const left = x.d || x.i, right = x.r;
      let pill = `<span class="pill" style="background:${rt.color};color:${rt.text === "light" ? "#f4f6f9" : "#12151a"}">${rt.label}</span>`;
      if (live) {
        const st = statusOf(x);
        pill = st.kind === "called"
          ? `<span class="pill" style="background:${SOLID[st.p]};color:#f4f6f9">✓ ${PARTY_WORD[st.p]} win</span>`
          : st.kind === "lead"
            ? `<span class="pill pill-lead lead-${st.p}">${st.p} +${st.by.toFixed(1)} · ${Math.round(st.reporting)}%</span>`
            : `<span class="pill pill-wait">No votes yet</span>`;
      }
      return `<li data-abbr="${a}" tabindex="0">
        <span class="ab">${a}</span>
        <span class="m">${last(left)}<span class="vs">v</span>${last(right)}</span>
        ${pill}
      </li>`;
    }).join("");
    }

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
    gStates.selectAll("path").classed("dim", d => d.abbr !== a && !!fillFor(d.abbr));
  }
  function unfocus() {
    hl.attr("d", null);
    gStates.selectAll("path").classed("dim", false);
  }

  // ---------- Tooltip ----------
  const tip = document.getElementById("tip");

  const RANK = { TU: 0, LD: 1, LR: 1, LkD: 2, LkR: 2, SD: 3, SR: 3 };
  function houseTipHTML(a) {
    const seats = H.seats[a];
    const list = distsIn(a).sort((x, y) => RANK[x[3]] - RANK[y[3]] || x[0].localeCompare(y[0]));
    const close = list.filter(d => COMPETITIVE.includes(d[3])).length;
    const rows = list.map(([code, held, inc, rating, note, res]) => {
      const who = inc
        ? `${inc} <small>${held}${note ? ", " + note : ""}</small>`
        : `<small>${note}</small>`;
      const flip = held && ((held === "R" && rating.endsWith("D")) || (held === "D" && rating.endsWith("R")));
      const resLine = res && res.reporting > 0
        ? `<span class="res">${res.called ? `<b class="res-called" style="color:${SOLID[res.called]}">✓ ${PARTY_WORD[res.called]} win</b> · ` : "Not called · "}D ${res.d.toFixed(1)} · R ${res.r.toFixed(1)} · ${res.reporting}% counted</span>`
        : "";
      return `<li><span class="code">${code}</span><span class="who">${who}${flip ? " <small>· flip</small>" : ""}</span>${pillHTML(rating)}${resLine}</li>`;
    }).join("");
    return `<button class="tip-close" aria-label="Close">×</button>
      <div class="tip-head"><h3>${NAMES[a]}</h3><span class="tip-kind">${seats} seat${seats > 1 ? "s" : ""}</span></div>
      ${list.length
        ? `<ul class="dists">${rows}</ul>`
        : `<p class="muted" style="margin:8px 0 0">${seats > 1 ? `All ${seats} seats are` : "The one seat is"} rated Solid for the party that holds it.</p>`}
      <div class="tip-src">${close ? `${close} toss up or lean · ` : ""}Solid seats not listed · ratings from Cook</div>`;
  }

  function tipHTML(a) {
    if (chamber === "house") return houseTipHTML(a);
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

    const avg = race.avg;
    const counted = res && res.reporting > 0;
    const shares = counted ? res : (avg && avg.d != null ? avg : null);

    const cands = [["D", race.d], ["R", race.r], ["I", race.i]].filter(([, n]) => n);
    const rows = cands.map(([p, n]) => {
      const pct = shares && shares[p.toLowerCase()] != null ? shares[p.toLowerCase()] : null;
      const won = res && res.called === p ? " ✓" : "";
      return `<li>
        <span class="chip" style="background:${PARTY[p]}">${p}</span>
        <span>${n}${race.inc === p ? ' <span class="inc">incumbent</span>' : ""}${won}</span>
        <span class="pct">${pct != null ? pct.toFixed(1) + "%" : ""}</span>
        ${pct != null ? `<span class="vbar" style="width:${pct}%;background:${PARTY[p]}"></span>` : ""}
      </li>`;
    }).join("");

    // Headline margin: the count once votes are in, otherwise the polling average.
    let lead = null;
    if (shares) {
      const ranked = cands.map(([p]) => [p, shares[p.toLowerCase()] || 0]).sort((a, b) => b[1] - a[1]);
      if (ranked.length > 1) lead = { p: ranked[0][0], by: ranked[0][1] - ranked[1][1] };
    } else if (avg && avg.lead) {
      lead = { p: avg.lead, by: avg.by };
    }
    const nameOf = p => last(p === "D" ? race.d : p === "R" ? race.r : race.i);
    const LEAD_INK = { D: "var(--d1)", R: "var(--r1)", I: "var(--ind)" };
    const leadLine = lead
      ? (lead.by < 0.05
          ? `<div class="lead">Tied</div>`
          : `<div class="lead" style="color:${LEAD_INK[lead.p]}">${nameOf(lead.p)} +${lead.by.toFixed(1)}</div>`)
      : "";
    const leadSub = counted ? "votes counted" : avg ? (avg.d != null ? "polling" : "polling average") : "";

    const flip = rt && race.held && ((race.held === "R" && rt.key.endsWith("D")) || (race.held === "D" && rt.key.endsWith("R")));
    const st = statusOf(race);
    const winner = st.kind === "called" ? (st.p === "D" ? race.d : st.p === "R" ? race.r : race.i) : null;
    const flipped = winner && race.held && st.p !== race.held;
    const banner = st.kind === "called"
      ? `<div class="tip-status won" style="--c:${SOLID[st.p]}">✓ Called: ${winner} wins${flipped ? " · flip" : ""}</div>`
      : st.kind === "lead"
        ? `<div class="tip-status open">Not called yet · ${res.reporting}% of votes counted</div>`
        : hasResults() ? `<div class="tip-status open">Not called · no votes counted yet</div>` : "";
    return `<button class="tip-close" aria-label="Close">×</button>
      <div class="tip-head"><h3>${NAMES[a]}</h3><span class="tip-kind">${kind}</span></div>
      ${banner}
      ${leadLine ? `<div class="lead-row">${leadLine}<span class="lead-sub">${leadSub}</span></div>` : ""}
      <span class="pill" style="background:${rt.color};color:${rt.text === "light" ? "#f4f6f9" : "#12151a"}">${hasResults() ? "Cook: " : ""}${rt.label}${flip && !hasResults() ? " · flip" : ""}</span>
      <ul class="cands">${rows}</ul>
      ${!counted && avg ? `<p class="avg-src">${avg.src}</p>` : ""}
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
    if (hasRace(a)) focusState(a); else unfocus();
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
    if (hasRace(a)) focusState(a); else unfocus();
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

  // ---------- Status strip: how many races are called in each chamber ----------
  function renderStatus() {
    const el = document.getElementById("status");
    const any = ["senate", "governor"].some(c => Object.values(E[c].races).some(r => r.result)) || H.called.D + H.called.R > 0;
    el.hidden = !any;
    if (!any) return;
    const chip = (key, name, called, total, note) => `
      <button class="st-chip${chamber === key ? " on" : ""}" data-chamber="${key}">
        <span class="st-top"><span class="st-name">${name}</span><span class="st-count"><b>${called}</b> of ${total} called</span></span>
        <span class="st-bar"><i style="width:${called / total * 100}%"></i></span>
        <span class="st-note">${note}</span>
      </button>`;
    const sideCount = c => {
      const races = Object.values(E[c].races);
      const called = races.filter(r => statusOf(r).kind === "called");
      const d = E[c].holdover.D + called.filter(r => r.result.called === "D").length;
      const r = E[c].holdover.R + called.filter(r => r.result.called === "R").length;
      return { called: called.length, total: races.length, d, r };
    };
    const s = sideCount("senate"), g = sideCount("governor");
    const hc = H.called.D + H.called.R;
    const pr = H.projected;
    el.innerHTML =
      chip("senate", "Senate", s.called, s.total, E.senate.projected
        ? `✓ ${E.senate.projected.party === "D" ? "Democrats" : "Republicans"} win control (${E.senate.projected.by}) · D ${s.d} · R ${s.r}`
        : `D ${s.d} · R ${s.r} · need 51`) +
      chip("house", "House", hc, 435, pr ? `✓ ${pr.party === "D" ? "Democrats" : "Republicans"} win control (${pr.by})` : `D ${H.called.D} · R ${H.called.R} · need 218`) +
      chip("governor", "Governors", g.called, g.total, `D ${g.d} · R ${g.r} governors`);
    el.querySelectorAll(".st-chip").forEach(b => b.addEventListener("click", () => {
      chamber = b.dataset.chamber;
      pinned = null;
      try { localStorage.setItem("chamber", chamber); } catch (e) {}
      render();
    }));
  }

  // ---------- Tabs ----------
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
    chamber = b.dataset.chamber;
    pinned = null;
    try { localStorage.setItem("chamber", chamber); } catch (e) {}
    render();
  }));
  const calledBox = document.getElementById("called-only");
  try { calledOnly = localStorage.getItem("calledOnly") === "1"; } catch (e) {}
  calledBox.checked = calledOnly;
  calledBox.addEventListener("change", () => {
    calledOnly = calledBox.checked;
    try { localStorage.setItem("calledOnly", calledOnly ? "1" : "0"); } catch (e) {}
    render();
  });

  try {
    const saved = localStorage.getItem("chamber");
    if (saved === "governor" || saved === "senate" || saved === "house") chamber = saved;
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
