import React, { useMemo, useState } from "react";
import TeamSelect from "./components/TeamSelect.jsx";
import NameSelect from "./components/NameSelect.jsx";
import AvailabilityGrid from "./components/AvailabilityGrid.jsx";

// Teams + simple Dutch-city passwords
const TEAMS = [
  { 
    id: "2xA", 
    name: "2x Herfst Ploeg A", 
    members: ["Pelt", "Wolfelaar", "Tangelder", "Meeuwesen", "Baltissen"] 
  },
  { 
    id: "2xB", 
    name: "2x Herfst Ploeg B", 
    members: ["Osinga", "Klei", "Morselt", "Reeuwijk", "Linger"] 
  },
  { 
    id: "2xC", 
    name: "2x Herfst Ploeg C", 
    members: ["Dabekausen", "Verburg", "Kroon", "Beunderman", "Faassen"] 
  },
  { 
    id: "2xD", 
    name: "2x Herfst Ploeg D", 
    members: ["Leijsje", "Beetsma", "Smit", "Wiebinga", "Willems"] 
  },
  { 
    id: "4pE", 
    name: "4+ Herfst Ploeg E", 
    members: ["Morselt", "de Jong", "Kollen", "Voppen", "Chen", "van Breemen", "Sterk", "Linger"] 
  },
  { 
    id: "4pF", 
    name: "4+ Herfst Ploeg F", 
    members: ["Patandin", "Van Zanten", "Schooneman", "Nieuwhuisen", "Kortekaas", "Plank", "Groeneveld", "Ittersum"] 
  },
  { 
    id: "4pG", 
    name: "4+ Herfst Ploeg G", 
    members: ["Florian Steinborn", "Kane Bloemers", "Tim Hohlbein", "Lowie Boons", "Schuijt", "Rhoon"] 
  },
  {
    id: "2xH",
    name: "de ORC",
    members: ["Guusje", "Rosa", "Anja", "Sebas", "Aron", "Laurens", "Gijs"] 
  }
];

const TEAM_PASSWORDS = {
  "2xA": "Utrecht",
  "2xB": "Leiden",
  "2xC": "Delft",
  "2xD": "Amsterdam",
  "4pE": "Rotterdam",
  "4pF": "Haarlem",
  "4pG": "Eindhoven",
  "2xH": "VoRC",
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
  const [anchor, setAnchor] = useState(() => weekStart());
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
          onPrevWeek={()=>{ 
            const d = new Date(anchor); 
            d.setDate(d.getDate() - 7); 
            setAnchor(weekStart(d)); 
          }}
          onNextWeek={()=>{ 
            const d = new Date(anchor); 
            d.setDate(d.getDate() + 7); 
            setAnchor(weekStart(d)); 
          }}
          onBack={()=>setUserId(null)}
        />
      )}
      <footer>v1 • in development • gemaakt door jullie ORC 😘</footer>
    </div>
  );
}
