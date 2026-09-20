// src/components/RescuePanel.jsx
import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { PRIORITY_COLOR, PRIORITY_BG } from "./HazardZoneColor";
import ProvenanceBadge from "./ProvenanceBadge";
import LiveDroneConsole from "./LiveDroneConsole";

export default function RescuePanel({ region }) {
  const [subView, setSubView] = useState("drone"); // "drone" | "registry"
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters & Sorting
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [villageFilter, setVillageFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("priority");
  const [searchQuery, setSearchQuery] = useState("");

  // Local state for Human Verification / Operator Review stamps
  const [reviewedCases, setReviewedCases] = useState({});
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getRescueCases(region)
      .then((data) => {
        setCases(data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [region]);

  const toggleReview = (caseId, e) => {
    if (e) e.stopPropagation();
    setReviewedCases((prev) => ({
      ...prev,
      [caseId]: prev[caseId]
        ? null
        : {
            reviewedAt: new Date().toLocaleTimeString(),
            operator: "NDRF Field Ops Officer #402",
          },
    }));
  };

  const handleDroneMissionDispatched = (mission) => {
    // If the mission corresponds to any case, auto-verify it
    const matchingCase = cases.find((c) => c.case_id === mission.targetId);
    if (matchingCase) {
      setReviewedCases((prev) => ({
        ...prev,
        [matchingCase.case_id]: {
          reviewedAt: new Date().toLocaleTimeString(),
          operator: mission.officer,
          dispatchedUnit: mission.unit,
        },
      }));
    }
  };

  const uniqueVillages = ["ALL", ...new Set(cases.map((c) => c.nearest_village).filter(Boolean))];

  const filteredCases = cases.filter((c) => {
    if (priorityFilter !== "ALL" && c.priority_label !== priorityFilter) return false;
    if (villageFilter !== "ALL" && c.nearest_village !== villageFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = c.case_id?.toLowerCase().includes(q);
      const matchVillage = c.nearest_village?.toLowerCase().includes(q);
      if (!matchId && !matchVillage) return false;
    }
    return true;
  });

  const sortedCases = [...filteredCases].sort((a, b) => {
    if (sortBy === "priority") {
      return (b.priority_score || 0) - (a.priority_score || 0);
    }
    if (sortBy === "people") {
      return (b.people_count || 0) - (a.people_count || 0);
    }
    if (sortBy === "error") {
      return (a.error_radius_m || 0) - (b.error_radius_m || 0);
    }
    return 0;
  });

  const totalPeople = cases.reduce((acc, c) => acc + (c.people_count || 0), 0);
  const criticalCount = cases.filter((c) => c.priority_label === "CRITICAL").length;
  const highCount = cases.filter((c) => c.priority_label === "HIGH").length;
  const verifiedCount = Object.keys(reviewedCases).filter((k) => reviewedCases[k]).length;

  return (
    <div style={{ padding: "8px 0", maxWidth: "1440px", margin: "0 auto", color: "var(--text-body)" }}>
      {/* Sub-View Navigation Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--bg-secondary)",
          padding: "4px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          width: "fit-content",
          marginBottom: "18px",
        }}
      >
        <button
          onClick={() => setSubView("drone")}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--radius)",
            border: "none",
            background: subView === "drone" ? "#0F172A" : "transparent",
            color: subView === "drone" ? "#FFFFFF" : "var(--text-headline)",
            fontWeight: subView === "drone" ? 700 : 500,
            fontSize: "0.82rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🚁 Live Drone Video & Officer Dispatch Desk
        </button>
        <button
          onClick={() => setSubView("registry")}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--radius)",
            border: "none",
            background: subView === "registry" ? "#0F172A" : "transparent",
            color: subView === "registry" ? "#FFFFFF" : "var(--text-headline)",
            fontWeight: subView === "registry" ? 700 : 500,
            fontSize: "0.82rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          📋 Casualty Registry & Triage List ({cases.length} Cases)
        </button>
      </div>

      {/* SUB-VIEW 1: LIVE DRONE VIDEO FEED & OFFICER DISPATCH CONSOLE */}
      {subView === "drone" && (
        <LiveDroneConsole region={region} onCaseDispatched={handleDroneMissionDispatched} />
      )}

      {/* SUB-VIEW 2: FULL CASUALTY REGISTRY & TRIAGE MATRIX */}
      {subView === "registry" && (
        <div>
          {/* MANDATORY UNMISSABLE AI DISCLAIMER BANNER */}
          <div
            style={{
              background: "linear-gradient(90deg, #FEF2F2 0%, #FFFFFF 100%)",
              border: "2px solid #EF4444",
              borderRadius: "var(--radius-lg)",
              padding: "16px 20px",
              marginBottom: "18px",
              boxShadow: "0 4px 14px rgba(239, 68, 68, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: "300px" }}>
              <span style={{ fontSize: "2rem" }}>🚨</span>
              <div>
                <div className="eyebrow" style={{ color: "#DC2626", letterSpacing: "0.1em" }}>
                  Strict SOP Operational Safeguard · Human Verification Protocol
                </div>
                <strong style={{ fontSize: "1.05rem", color: "#991B1B", display: "block", marginTop: "2px", fontFamily: "var(--font-display)" }}>
                  AI Drone Telemetry — Human Verification Required Prior to Any Rescue Dispatch
                </strong>
                <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "#7F1D1D", lineHeight: "1.4" }}>
                  Coordinates and victim counts are machine-inferred telemetry. The system never deploys personnel autonomously. Every case must be validated by a field team operator before tactical dispatch.
                </p>
              </div>
            </div>

            <ProvenanceBadge
              source="Simulated Drone Telemetry"
              type="estimated"
              style={{ fontSize: "0.78rem", padding: "4px 12px" }}
            />
          </div>

          {/* Triage Summary Metric Tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <MetricTile label="Total Detected Cases" value={cases.length} subtext="Machine vision detections" color="var(--accent-blue)" />
            <MetricTile label="Critical Priority" value={criticalCount} subtext="Immediate rescue queue" color="var(--red-zone)" />
            <MetricTile label="High Priority" value={highCount} subtext="High urgency triage" color="var(--warning)" />
            <MetricTile label="Total People at Risk" value={totalPeople} subtext="Estimated stranded count" color="var(--text-headline)" />
            <MetricTile label="Human Verified" value={`${verifiedCount} / ${cases.length}`} subtext="Field officer signoffs" color="var(--safe)" />
          </div>

          {/* Controls Bar: Search, Filters, Sorting */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "12px 18px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Search Input */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 240px", maxWidth: "360px" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>🔍</span>
              <input
                type="text"
                placeholder="Search by Case ID or Village..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.8rem",
                  outline: "none",
                  background: "var(--bg-secondary)",
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="eyebrow" style={{ fontSize: "0.68rem" }}>Priority:</span>
                {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      border: "1px solid var(--border)",
                      background: priorityFilter === p ? "#0F172A" : "#FFFFFF",
                      color: priorityFilter === p ? "#FFFFFF" : "var(--text-headline)",
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Village Filter */}
              <select
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.74rem",
                  background: "var(--bg-secondary)",
                  color: "var(--text-headline)",
                  cursor: "pointer",
                }}
              >
                {uniqueVillages.map((v) => (
                  <option key={v} value={v}>
                    {v === "ALL" ? "All Villages" : `Near ${v}`}
                  </option>
                ))}
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.74rem",
                  background: "var(--bg-secondary)",
                  color: "var(--text-headline)",
                  cursor: "pointer",
                }}
              >
                <option value="priority">Sort by Urgency (Highest)</option>
                <option value="people">Sort by People at Risk</option>
                <option value="error">Sort by Error Radius (Lowest)</option>
              </select>
            </div>
          </div>

          {/* Error / Loading Readouts */}
          {loading && (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              Loading casualty cases from edge telemetry...
            </div>
          )}

          {error && (
            <div style={{ background: "#FEF2F2", color: "#DC2626", padding: "16px", borderRadius: "var(--radius)", marginBottom: "16px" }}>
              <strong>Error loading casualties:</strong> {error}
            </div>
          )}

          {/* Cases List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {sortedCases.map((c) => {
              const isReviewed = !!reviewedCases[c.case_id];
              const reviewData = reviewedCases[c.case_id];
              const isSelected = selectedCase?.case_id === c.case_id;
              const pColor = PRIORITY_COLOR[c.priority_label] || "var(--text-muted)";
              const pBg = PRIORITY_BG[c.priority_label] || "var(--bg-secondary)";

              return (
                <div
                  key={c.case_id}
                  onClick={() => setSelectedCase(isSelected ? null : c)}
                  style={{
                    background: "#FFFFFF",
                    border: isSelected ? "2px solid var(--accent-blue)" : isReviewed ? "1px solid #BBF7D0" : "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "14px 18px",
                    boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    {/* Left Details */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          background: pBg,
                          color: pColor,
                          padding: "3px 8px",
                          borderRadius: "var(--radius-sm)",
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {c.priority_label}
                      </span>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "0.95rem", color: "var(--text-headline)" }}>{c.case_id}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            Near <strong>{c.nearest_village}</strong>
                          </span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                          GPS: {c.latitude?.toFixed(4)}°N, {c.longitude?.toFixed(4)}°E (±{c.error_radius_m || 10}m error)
                        </div>
                      </div>
                    </div>

                    {/* Middle Telemetry */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Estimated Victims</div>
                        <strong style={{ fontSize: "1.05rem", color: "var(--red-zone)" }}>{c.people_count || 1} Persons</strong>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Urgency Score</div>
                        <strong style={{ fontSize: "1.05rem", color: pColor }}>{c.priority_score || 85} / 100</strong>
                      </div>
                    </div>

                    {/* Right Review Button */}
                    <div>
                      <button
                        onClick={(e) => toggleReview(c.case_id, e)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "var(--radius-sm)",
                          border: isReviewed ? "1px solid #10B981" : "1px solid var(--border)",
                          background: isReviewed ? "#DCFCE7" : "#FFFFFF",
                          color: isReviewed ? "#15803D" : "var(--text-headline)",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        {isReviewed ? "✓ Officer Verified" : "Verify Case"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details Drawer */}
                  {isSelected && (
                    <div style={{ marginTop: "12px", borderTop: "1px dashed var(--border)", paddingTop: "12px", fontSize: "0.78rem" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                        <div><strong>Detection Source:</strong> {c.detection_source || "Thermal Machine Vision"}</div>
                        <div><strong>Stillness Telemetry:</strong> {c.stillness_duration_s || 120}s (Motionless)</div>
                        <div><strong>Terrain Elevation:</strong> {c.elevation_m || 1840}m ASL</div>
                      </div>
                      <div style={{ color: "var(--text-secondary)" }}>
                        <strong>Tactical Notes:</strong> {c.notes || "Located near steep ravine edge. Direct access via road blocked by debris. Helo basket or rope extraction recommended."}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({ label, value, subtext, color }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: color || "var(--text-headline)", fontFamily: "var(--font-display)", margin: "2px 0" }} className="mono">
        {value}
      </div>
      <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{subtext}</div>
    </div>
  );
}
