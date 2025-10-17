import React, { useMemo, useState } from "react";
import TeamSelect from "./components/TeamSelect.jsx";
import NameSelect from "./components/NameSelect.jsx";
import AvailabilityGrid from "./components/AvailabilityGrid.jsx";

// Teams + simple Dutch-city passwords
const TEAMS = [
  { id: "4pA", name: "4+ Ploeg A", members: ["anja","isa","tessa","saskia","marta","myrthe", "marjolein"] },
  { id: "4pB", name: "4+ Ploeg B", members: ["anja","rosa","freija","florien","anniek","simone", "marta", "jadey"] },
  { id: "2xA", name: "2x Ploeg C", members: ["guusje","laurens","aron","sebas","anja", "rosa"] },
];

const TEAM_PASSWORDS = {
  "4pA": "Utrecht",
  "4pB": "Leiden",
  "2xA": "Delft",
};

function weekStart(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}
function fmtYMD(d) { return d.toISOString().slice(0,10); }

export default function App() {
  const [teamId, setTeamId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [anchor, setAnchor] = useState(weekStart());
  const ws = useMemo(() => fmtYMD(anchor), [anchor]);

  const team = teamId ? TEAMS.find(t=>t.id===teamId) : null;

  return (
    <div className="app">
      <h1>Herfst Ploegen 🍂 Trainings Planner </h1>

      {!teamId && (
        <TeamSelect
          teams={TEAMS}
          passwords={TEAM_PASSWORDS}   // step 1b: password gate
          onPick={(id)=>setTeamId(id)} // only called after correct password
        />
      )}

      {teamId && !userId && (
        <NameSelect
          team={team}
          onBack={()=>setTeamId(null)}
          onPick={(name)=>setUserId(name)}
        />
      )}

      {teamId && userId && (
        <AvailabilityGrid
          team={team}
          userId={userId}
          weekStart={ws}
          onPrevWeek={()=>{ const d=new Date(anchor); d.setDate(d.getDate()-7); setAnchor(d); }}
          onNextWeek={()=>{ const d=new Date(anchor); d.setDate(d.getDate()+7); setAnchor(d); }}
          onBack={()=>setUserId(null)}
        />
      )}
      <footer>v1 • it's in dev 🙃</footer>
    </div>
  );
}
