import React from "react";

export default function NameSelect({ team, onPick, onBack }) {
  return (
    <div>
      <button onClick={onBack}>← Terug</button>
      <h2>Kies je naam ({team.name})</h2>
      <div className="pill-list">
        {team.members.map(m=>(
          <button key={m} className="pill" onClick={()=>onPick(m)}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
