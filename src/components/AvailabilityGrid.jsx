import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
doc, setDoc, onSnapshot, collection, query, getDoc
} from "firebase/firestore";
// NOTE: html2canvas removed since PNG export is no longer used

/* =========================
   Helpers (team logic + UI)
   ========================= */
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const START_HOUR = 9;     // 09:00
const SLOTS = 16;         // 9–17 in 30-min steps
const WINDOW = 3;         // 90 minutes = 3 slots
const cellId = (d,t)=>`D${d}_T${t}`;

function makeEmptyGrid() {
  const g = {};
  for (let d=0; d<7; d++) for (let t=0; t<SLOTS; t++) g[cellId(d,t)] = false;
  return g;
}
function slotToTime(t) {
  const mins = START_HOUR*60 + t*30;
  const h = Math.floor(mins/60), m = mins%60;
  return `${String(h).padStart(2,"0")}:${m===0?"00":"30"}`;
}

// Shorten names for compact card labels: "Anja, Isa +2"
function formatNamesShort(arr, max=2){
  if (!arr || arr.length===0) return "";
  const shown = arr.slice(0, max);
  const rem = arr.length - shown.length;
  return rem>0 ? `${shown.join(", ")} +${rem}` : shown.join(", ");
}

// Who is available for ALL slots in the 90-min window?
function membersAvailableForWindow(team, teamGrids, d, t, len = WINDOW) {
  const needSlots = Array.from({length: len}, (_,k)=>cellId(d, t+k));
  const out = [];
  for (const name of team.members) {
    const grid = teamGrids[name] || {};
    const ok = needSlots.every(cid => !!grid[cid]);
    if (ok) out.push(name);
  }
  return out;
}

// Decide team type + threshold from the team name/id
function teamTypeAndThreshold(team){
  const label = (team.name || team.id || "").toLowerCase();
  if (label.includes("4+")) return { kind: "4plus", threshold: 6 };
  if (label.includes("2x")) return { kind: "2x",     threshold: 3 };
  return { kind: "4plus", threshold: 6 };
}

// Build suggestions specifically for THIS team type
function buildTeamSuggestions(team, teamGrids) {
  const { kind, threshold } = teamTypeAndThreshold(team);
  const sugg = [];
  for (let d=0; d<7; d++){
    for (let t=0; t<=SLOTS-WINDOW; t++){
      const members = membersAvailableForWindow(team, teamGrids, d, t, WINDOW);
      if (members.length >= threshold) {
        sugg.push({ d, t, len: WINDOW, kind, count: members.length, members });
      }
    }
  }
  return sugg;
}

// Assign non-overlapping "lanes" to suggestions on each day (for readable overlaps)
function addLanesPerDay(suggestions) {
  const byDay = Array.from({length: 7}, () => []);
  suggestions.forEach((s) => byDay[s.d].push({ ...s }));

  const withLanes = [];
  byDay.forEach((list) => {
    list.sort((a, b) => a.t - b.t);
    const active = [];
    for (const s of list) {
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].end <= s.t) active.splice(i, 1);
      }
      let lane = 0;
      while (active.some(a => a.lane === lane)) lane++;
      active.push({ lane, end: s.t + s.len });
      withLanes.push({ ...s, lane });
    }
  });
  return withLanes;
}

// Group overlay counts for the heatmap
function computeCounts(allUsersGrids){
  const counts = {};
  for (const grid of allUsersGrids) {
    Object.entries(grid||{}).forEach(([cid,val])=>{
      if (val) counts[cid]=(counts[cid]||0)+1;
    });
  }
  return counts;
}

/* =========================
   Component
   ========================= */
export default function AvailabilityGrid({ team, userId, weekStart, onPrevWeek, onNextWeek, onBack }) {
  const [myGrid, setMyGrid] = useState(makeEmptyGrid());
  const [teamGrids, setTeamGrids] = useState({});         // { memberName: {grid...} }
  const [dragging, setDragging] = useState(null);         // true=select, false=unselect, null=none
  const [openIdx, setOpenIdx] = useState(null);           // sidebar dropdown open index
  const [showOverlay, setShowOverlay] = useState(false);  // start overlay OFF by default
  const [openCalKey, setOpenCalKey] = useState(null);     // calendar-card popover key

  const teamWeekKey = `${team.id}_${weekStart}`;
  const myDocRef = useMemo(() => 
    doc(db, "availability", teamWeekKey, "users", userId), 
    [teamWeekKey, userId]
  );

  // Subscribe to team availability (whole team)
  useEffect(()=>{
    const q = query(collection(db, "availability", teamWeekKey, "users"));
    const unsub = onSnapshot(q, (snap)=>{
      const obj = {};
      snap.forEach(d=>{
        const data = d.data();
        const grid = data?.grid || data || {};
        obj[d.id] = grid;
      });
      setTeamGrids(obj);
    });
    return ()=>unsub();
  }, [teamWeekKey]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const snap = await getDoc(myDocRef);
        const data = snap.data();
        const grid = data?.grid || data || {};
        if (!canceled && grid && Object.keys(grid).length) {
          // Replace local grid with the saved one so the UI shows it immediately
          setMyGrid(prev => ({ ...prev, ...grid }));
        }
      } catch (e) {
        // no-op: if read fails, the onSnapshot will still populate when it arrives
        console.warn("Prefetch my grid failed:", e);
      }
    })();
    return () => { canceled = true; };
  }, [myDocRef]);
  

  // NEW: also subscribe to my own doc so my grid always repopulates when returning
  useEffect(()=>{
    const unsub = onSnapshot(myDocRef, (snap)=>{
      const data = snap.data();
      const grid = data?.grid || data || {};
      if (grid && Object.keys(grid).length) {
        setMyGrid(g=>({ ...g, ...grid }));
      }
    });
    return ()=>unsub();
  }, [myDocRef]);

  // Helpers: toggle, drag, clear
  async function toggleCell(d,t){
    const cid = cellId(d,t);
    const next = !myGrid[cid];
    const newGrid = { ...myGrid, [cid]: next };
    setMyGrid(newGrid);
    await setDoc(myDocRef, { grid: newGrid }, { merge: true });
  }
  function onMouseDown(d,t){
    const selectMode = !myGrid[cellId(d,t)];
    setDragging(selectMode);
    toggleCell(d,t);
  }
  function onEnter(d,t){
    if (dragging===null) return;
    const cid = cellId(d,t);
    const want = dragging;
    if ((myGrid[cid]||false)!==want) toggleCell(d,t);
  }
  function onMouseUp(){ setDragging(null); }
  async function clearMyWeek(){
    const ok = window.confirm("Weet je zeker dat je je beschikbaarheid voor deze week wilt verwijderen?");
    if (!ok) return;
    const empty = makeEmptyGrid();
    setMyGrid(empty);
    await setDoc(myDocRef, { grid: empty }, { merge: true });
  }

  /* =========================
     INSERTED: Touch support
     ========================= */
  // --- touch support state ---
  const [touchDragging, setTouchDragging] = useState(null); // true=select, false=unselect, null=no drag
  const touchStateRef = React.useRef({ lastCid: null });

  // helper to toggle a cell by indices with throttling for touch-drag
  async function toggleCellIfNeeded(d, t, want) {
    const cid = cellId(d, t);
    const current = !!myGrid[cid];
    if (want === undefined) {
      await toggleCell(d, t);
      return;
    }
    if (current !== want) {
      await toggleCell(d, t);
    }
    touchStateRef.current.lastCid = cid;
  }

  // convert a touched element to grid coords (uses data-d / data-t on <td>)
  function getCellFromTouchEvent(e) {
    const touch = e.touches && e.touches[0];
    if (!touch) return null;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return null;
    const td = el.closest && el.closest("td[data-d][data-t]");
    if (!td) return null;
    const d = Number(td.dataset.d);
    const t = Number(td.dataset.t);
    if (Number.isNaN(d) || Number.isNaN(t)) return null;
    return { d, t, cid: cellId(d, t) };
  }

  // touch handlers
  function onTouchStartCell(d, t, e) {
    e.preventDefault();
    const cid = cellId(d, t);
    const selectMode = !myGrid[cid];
    setTouchDragging(selectMode);
    toggleCellIfNeeded(d, t, selectMode);
  }

  function onTouchMoveGrid(e) {
    if (touchDragging === null) return;
    e.preventDefault();
    const hit = getCellFromTouchEvent(e);
    if (!hit) return;
    const { d, t, cid } = hit;
    if (cid === touchStateRef.current.lastCid) return;
    toggleCellIfNeeded(d, t, touchDragging);
  }

  function onTouchEndGrid() {
    setTouchDragging(null);
    touchStateRef.current.lastCid = null;
  }

  // Counts & suggestions
  const counts = useMemo(()=>computeCounts(Object.values(teamGrids)),[teamGrids]);
  const displayCounts = useMemo(()=> showOverlay ? counts : {}, [counts, showOverlay]);

  const rawSuggestions = useMemo(
    () => buildTeamSuggestions(team, teamGrids),
    [team, teamGrids]
  );
  const suggestions = useMemo(
    () => addLanesPerDay(rawSuggestions),
    [rawSuggestions]
  );

  // Map each suggestion to covered cells (with lanes + start/end flags)
  const suggestionCells = useMemo(() => {
    const map = {};
    suggestions.forEach((s) => {
      const key = `${s.d}-${s.t}-${s.lane}`;
      for (let k = 0; k < s.len; k++) {
        const cid = cellId(s.d, s.t + k);
        (map[cid] = map[cid] || []).push({
          kind: s.kind,
          start: k === 0,
          end: k === s.len - 1,
          lane: s.lane,
          members: s.members,
          key
        });
      }
    });
    return map;
  }, [suggestions]);

  return (
    <div>
      <div className="row">
        <div>
          <button onClick={onBack}>← Terug</button>
          {/* Split header across lines for clarity */}
          <h2 style={{marginBottom:4}}>Vul je beschikbaarheid in - {userId}</h2>
          

          {/* Controls: week nav, overlay toggle, clear */}
          <div className="week-nav" style={{gap: 12, alignItems: "center"}}>
            <button onClick={onPrevWeek}>← Vorige week</button>
            <div>Week of <b>{weekStart}</b></div>
            <button onClick={onNextWeek}>Volgende week →</button>
            <label style={{marginLeft: "auto", display: "flex", alignItems: "center", gap: 6}}>
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(e)=>setShowOverlay(e.target.checked)}
              />
              Toon team overlay
            </label>
            <button onClick={clearMyWeek} title="Verwijder al je beschikbaarheid voor deze week">Clear</button>
          </div>

          {/* Main availability grid */}
          <div id="grid-wrap"
               onMouseLeave={()=>setDragging(null)}
               onMouseUp={onMouseUp}>
            <table className="grid">
              <thead>
                <tr>
                  <th></th>
                  {DAYS.map((d,i)=><th key={i}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({length:SLOTS}).map((_,t)=>(
                  <tr key={t}>
                    <td className="time">{slotToTime(t)}</td>
                    {Array.from({length:7}).map((__,d)=>{
                      const cid = cellId(d,t);
                      const mine = !!myGrid[cid];
                      const c = displayCounts[cid]||0; // respects overlay toggle
                      return (
                        <td key={cid}
                            className={`cell ${mine?"mine":""}`}
                            data-count={c}
                            data-d={d}
                            data-t={t}
                            onMouseDown={()=>onMouseDown(d,t)}
                            onMouseEnter={()=>onEnter(d,t)}
                            onClick={()=>toggleCell(d,t)}
                            onTouchStart={(e)=>onTouchStartCell(d,t,e)}
                            onTouchMove={onTouchMoveGrid}
                            onTouchEnd={onTouchEndGrid}
                            onTouchCancel={onTouchEndGrid}
                        >
                          {showOverlay && c>0 && <span className="count">{c}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="legend">
            <div><span className="swatch me"></span> Jouw beschikbaarheid</div>
            <div><span className="swatch group"></span> Team overlay (intensiteit = # beschikbaar)</div>
          </div>

          {/* ==== Calendar-style view with lanes & clickable cards ==== */}
          <section className="cal-suggestions-wrap">
            <h3 style={{marginTop:0}}>Automatische trainingsopties – Kalenderweergave</h3>
            <div className="hint">
              We tonen hier 90-min opties (15m voorbereiding + 60m roeien + 15m schoonmaken).
              Klik een kaartje om alle namen te zien.
            </div>
            <div id="cal-grid-wrap">
              <table className="cal-grid">
                <thead>
                  <tr>
                    <th></th>
                    {DAYS.map((d,i)=><th key={i}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: SLOTS }).map((_, t) => (
                    <tr key={t}>
                      <td className="time">{slotToTime(t)}</td>
                      {Array.from({ length: 7 }).map((__, d) => {
                        const cid = cellId(d, t);
                        const hits = suggestionCells[cid] || [];
                        const hasAny = hits.length > 0;
                        const classes = [
                          "cell",
                          hasAny ? "s4plus" : "",          // orange background for any suggestion (4+ or 2x)
                          hits.length > 1 ? "multi" : "",
                        ].join(" ").trim();

                        // cards only render on the first 30-min cell of each suggestion
                        const starters = hits.filter(h => h.start);

                        return (
                          <td key={cid} className={classes}>
                            {/* lane-offset light orange background per suggestion */}
                            {hits.map((h, ii) => (
                              <span
                                key={`bg-${ii}`}
                                className={`cal-bg ${h.start ? "is-start" : ""} ${h.end ? "is-end" : ""}`}
                                style={{ "--lane-offset": `${h.lane * 14}px` }}
                                aria-hidden
                              />
                            ))}

                            {/* continuous vertical rails per lane */}
                            {hits.map((h, ii) => (
                              <span
                                key={`rail-${ii}`}
                                className="cal-rail r4plus"
                                style={{ transform: `translateX(${6 + h.lane * 14}px)` }}
                                aria-hidden
                              />
                            ))}

                            {/* small clickable card at the start of each window (shows short names) */}
                            {starters.map((h, ii) => {
                              const fullNames = (h.members || []).join(", ");
                              const shortNames = formatNamesShort(h.members || [], 2);
                              const label = h.kind === "4plus" ? "4+" : "2x";
                              const cardKey = h.key;              // unique key per suggestion instance
                              const isOpen = openCalKey === cardKey;

                              return (
                                <button
                                  key={`card-${ii}`}
                                  className={`cal-card c4plus ${isOpen ? "open" : ""}`}
                                  style={{ transform: `translateX(${10 + h.lane * 14}px)` }}
                                  title={`${label} • ${fullNames}`}
                                  onClick={(e)=>{ e.stopPropagation(); setOpenCalKey(isOpen ? null : cardKey); }}
                                  aria-expanded={isOpen}
                                >
                                  {label}{shortNames ? ` — ${shortNames}` : ""}

                                  {/* popover with full list of names */}
                                  {isOpen && (
                                    <div className="cal-popover" role="dialog" aria-label="Beschikbare namen">
                                      <div className="pop-title">Beschikbaar</div>
                                      <ul>
                                        {(h.members || []).map((m)=> <li key={m}>{m}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ==== Sidebar dropdown list (titles WITHOUT names) ==== */}
        <aside className="suggestions">
          <h3 style={{marginTop:0}}>Automatische trainingsopties</h3>
          <p className="hint">
            Regel: 1.5h = 15m voorbereiding + 60m roeien + 15m schoonmaken.
            {(() => {
              const { kind, threshold } = teamTypeAndThreshold(team);
              return (
                <> • Team: <b>{kind === "4plus" ? "4+" : "2x"}</b> • Min. {threshold} personen nodig</>
              );
            })()}
          </p>

          {suggestions.length===0 && <div>Nog geen overlap deze week.</div>}

          {suggestions.map((s,idx)=>{
            const day = DAYS[s.d];
            const start = slotToTime(s.t);
            const end = slotToTime(s.t + s.len);
            const label = s.kind==="4plus" ? "4+" : "2x";
            const isOpen = openIdx === idx;

            return (
              <div key={idx} className={`bubble ${s.kind}`}>
                <button
                  className="sugg-btn"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  title={`${label} • ${day} ${start}–${end} • ${s.count} beschikbaar`}
                >
                  <b>{label}</b> • {day} {start}–{end} • {s.count} beschikbaar
                  <span className="chev">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="dropdown">
                    <div className="subhead">Beschikbaar:</div>
                    <ul>
                      {s.members.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
