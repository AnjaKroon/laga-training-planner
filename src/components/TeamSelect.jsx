import React, { useState, useMemo } from "react";

export default function TeamSelect({ teams, passwords, onPick }) {
  const [selected, setSelected] = useState(null);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  const selectedTeamName = useMemo(() => {
    const t = teams.find(x => x.id === selected);
    return t ? t.name : "";
  }, [teams, selected]);

  function handlePillClick(id) {
    // toggle behavior: click again to unselect
    setError("");
    setPwd("");
    setSelected(prev => (prev === id ? null : id));
  }

  function tryContinue() {
    if (!selected) {
      setError("Kies eerst een ploeg.");
      return;
    }
    const correct = (passwords?.[selected] || "").trim().toLowerCase();
    if (pwd.trim().toLowerCase() === correct && correct !== "") {
      setError("");
      onPick(selected);
    } else {
      setError("Onjuist wachtwoord. Probeer opnieuw.");
      setPwd("");
    }
  }

  return (
    <div>
      <h2>Stap 1) Kies je ploeg</h2>

      <div className="pill-list" style={{ marginBottom: 12 }}>
        {teams.map(t => (
          <button
            key={t.id}
            className={`pill ${selected === t.id ? "selected" : ""}`}
            onClick={() => handlePillClick(t.id)}
            aria-pressed={selected === t.id}
            title={t.name}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* 1b) password gate */}
      <div style={{ maxWidth: 360, display: "grid", gap: 8 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <b>Ploeg-wachtwoord:</b>
            
          </div>
          <input
            type="password"
            value={pwd}
            placeholder={
              selected
                ? "Voer wachtwoord in"
                : "Kies eerst een ploeg"
            }
            onChange={(e) => setPwd(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 8,
              background: selected ? "#fff" : "#f5f5f5",
            }}
            disabled={!selected}
            onKeyDown={(e) => {
              if (e.key === "Enter") tryContinue();
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="pill"
            onClick={tryContinue}
            disabled={!selected || pwd.trim() === ""}
            title="Verder"
          >
            Verder →
          </button>
          {selected && (
            <button
              className="pill"
              onClick={() => {
                setSelected(null);
                setPwd("");
                setError("");
              }}
              title="Selectie wissen"
              type="button"
            >
              Wis selectie
            </button>
          )}
        </div>

        {error && <div style={{ color: "#b00020", fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  );
}
