// src/components/LiveDroneConsole.jsx
import React, { useState, useEffect, useRef } from "react";
import ProvenanceBadge from "./ProvenanceBadge";

const PRESET_FEEDS = {
  uttarakhand: [
    {
      id: "himalayan_rubble",
      title: "⛰️ Sector 4: Himalayan Landslide & Debris (Rudraprayag)",
      location: "Gaurikund Highway Corridor (NH-107)",
      gps: "30.5482° N, 79.0611° E (±11.4m)",
      altitude: "185m AGL",
      gimbal: "-48°",
      defaultMode: "thermal",
      targets: [
        {
          id: "TGT-901",
          label: "Critical Trapped Survivor",
          confidence: 94,
          type: "human",
          status: "still",
          stillnessSec: 140,
          tempC: 37.2,
          box: { x: 38, y: 44, w: 22, h: 26 },
          recommendedUnit: "🚁 IAF / NDRF Helo Air-Drop Basket",
          notes: "Motionless under collapsed timber beam near rising riverbank",
        },
        {
          id: "TGT-902",
          label: "Landslide Debris Damming Stream",
          confidence: 98,
          type: "debris",
          status: "hazard",
          stillnessSec: 0,
          tempC: 13.8,
          box: { x: 68, y: 22, w: 26, h: 32 },
          recommendedUnit: "🚜 SDRF Heavy Debris Clearing Unit (JCB)",
          notes: "Massive boulder damming runoff channel on NH-107",
        },
      ],
    },
    {
      id: "valley_hiker",
      title: "🌲 Sector 7: Kedarnath Trek Choke Point (Rambara)",
      location: "Mandakini Gorge Trail",
      gps: "30.5891° N, 79.0524° E (±14.2m)",
      altitude: "210m AGL",
      gimbal: "-60°",
      defaultMode: "optical",
      targets: [
        {
          id: "TGT-903",
          label: "Stranded Pilgrim Group",
          confidence: 91,
          type: "human_group",
          status: "moving",
          stillnessSec: 15,
          tempC: 36.8,
          box: { x: 45, y: 52, w: 28, h: 30 },
          recommendedUnit: "🚑 Advance Trauma Rapid Response Team",
          notes: "4 pilgrims waving emergency cloth on isolated cliff ledge",
        },
      ],
    },
  ],
  odisha: [
    {
      id: "puri_rooftop",
      title: "🌊 Coastal Sector 2: Inundated Village Rooftop (Puri Coast)",
      location: "Astaranga Inundation Basin",
      gps: "19.9824° N, 86.2519° E (±8.6m)",
      altitude: "140m AGL",
      gimbal: "-35°",
      defaultMode: "thermal",
      targets: [
        {
          id: "TGT-904",
          label: "Submerged House Roof Victims",
          confidence: 96,
          type: "human_group",
          status: "still",
          stillnessSec: 110,
          tempC: 36.9,
          box: { x: 32, y: 38, w: 34, h: 36 },
          recommendedUnit: "🚤 NDRF Inflatable Rescue Boat (IRB Unit 12)",
          notes: "Family of 3 stranded on concrete roof surrounded by 3.5m surge water",
        },
      ],
    },
    {
      id: "cyclone_road",
      title: "🌪️ Sector 9: Mangrove Delta Washaway (Kakatpur)",
      location: "Devi River Delta Causeway",
      gps: "19.9140° N, 86.1982° E (±12.0m)",
      altitude: "165m AGL",
      gimbal: "-45°",
      defaultMode: "optical",
      targets: [
        {
          id: "TGT-905",
          label: "Washed-Out Culvert Bridge",
          confidence: 99,
          type: "debris",
          status: "hazard",
          stillnessSec: 0,
          tempC: 21.2,
          box: { x: 55, y: 40, w: 35, h: 42 },
          recommendedUnit: "🚜 SDRF Heavy Debris Clearing Unit (JCB)",
          notes: "Complete bridge span breach cutting off 1,400 villagers",
        },
      ],
    },
  ],
};

const RESCUE_UNITS = [
  { id: "boat", name: "🚤 NDRF Inflatable Rescue Boat (IRB Unit 12)", etaMin: 14, base: "District Water Operations Base" },
  { id: "helo", name: "🚁 IAF / NDRF Helo Air-Drop Basket", etaMin: 8, base: "Forward Tactical Helipad" },
  { id: "medic", name: "🚑 Advance Trauma Rapid Response Team", etaMin: 18, base: "District Base Hospital" },
  { id: "jcb", name: "🚜 SDRF Heavy Debris Clearing Unit (JCB 3DX)", etaMin: 25, base: "Highway Logistics Depot" },
];

export default function LiveDroneConsole({ region = "uttarakhand", onCaseDispatched }) {
  const feedList = PRESET_FEEDS[region] || PRESET_FEEDS.uttarakhand;
  const [selectedFeedId, setSelectedFeedId] = useState(feedList[0].id);
  const currentFeed = feedList.find((f) => f.id === selectedFeedId) || feedList[0];

  const [visionMode, setVisionMode] = useState(currentFeed.defaultMode || "thermal"); // "thermal" | "optical"
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedTargetId, setSelectedTargetId] = useState(currentFeed.targets[0]?.id || null);
  const [customVideoUrl, setCustomVideoUrl] = useState(null);
  const [customFileName, setCustomFileName] = useState("");

  // Officer Verification State
  const [verifiedTargets, setVerifiedTargets] = useState({});
  const [dismissedTargets, setDismissedTargets] = useState({});

  // Active Dispatched Missions
  const [dispatchedMissions, setDispatchedMissions] = useState([
    {
      missionId: "MISSION-NDRF-8821",
      targetId: "TGT-PREV-01",
      targetLabel: "Elderly Survivor in Mudflow",
      gps: "30.5410° N, 79.0682° E",
      unit: "🚁 IAF / NDRF Helo Air-Drop Basket",
      dispatchedAt: "19:42:10",
      etaMin: 4,
      status: "IN TRANSIT",
      officer: "NDRF Tactical Officer #402",
    },
  ]);

  const [selectedRescueUnit, setSelectedRescueUnit] = useState(RESCUE_UNITS[0].id);
  const [dispatchAlert, setDispatchAlert] = useState(null);
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [activeManifestMission, setActiveManifestMission] = useState(null);

  const fileInputRef = useRef(null);

  // Sync selected target when feed changes
  useEffect(() => {
    if (currentFeed.targets && currentFeed.targets.length > 0) {
      setSelectedTargetId(currentFeed.targets[0].id);
      setVisionMode(currentFeed.defaultMode || "thermal");
    }
  }, [currentFeed]);

  const activeTarget = currentFeed.targets.find((t) => t.id === selectedTargetId) || currentFeed.targets[0];
  const isTargetVerified = activeTarget ? !!verifiedTargets[activeTarget.id] : false;
  const isTargetDismissed = activeTarget ? !!dismissedTargets[activeTarget.id] : false;

  // Handle Video File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setCustomFileName(file.name);
      setIsPlaying(true);
    }
  };

  // Officer Approval Action
  const handleVerifyTarget = (targetId) => {
    setVerifiedTargets((prev) => ({
      ...prev,
      [targetId]: {
        officer: "NDRF Tactical Officer #402 (Command Desk)",
        timestamp: new Date().toLocaleTimeString(),
        badge: "VERIFIED_VALID",
      },
    }));
    setDismissedTargets((prev) => {
      const copy = { ...prev };
      delete copy[targetId];
      return copy;
    });
  };

  // Officer Dismiss Action
  const handleDismissTarget = (targetId) => {
    setDismissedTargets((prev) => ({
      ...prev,
      [targetId]: {
        officer: "NDRF Tactical Officer #402",
        timestamp: new Date().toLocaleTimeString(),
        reason: "False Positive / Non-Critical",
      },
    }));
    setVerifiedTargets((prev) => {
      const copy = { ...prev };
      delete copy[targetId];
      return copy;
    });
  };

  // 1-Click Tactical Rescue Dispatch Action
  const handleDispatchRescue = () => {
    if (!activeTarget) return;

    const unitObj = RESCUE_UNITS.find((u) => u.id === selectedRescueUnit) || RESCUE_UNITS[0];
    const missionNumber = `MISSION-NDRF-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMission = {
      missionId: missionNumber,
      targetId: activeTarget.id,
      targetLabel: activeTarget.label,
      gps: currentFeed.gps,
      unit: unitObj.name,
      dispatchedAt: new Date().toLocaleTimeString(),
      etaMin: unitObj.etaMin,
      status: "IN TRANSIT",
      officer: "NDRF Tactical Officer #402 (Command Desk)",
      notes: activeTarget.notes,
    };

    setDispatchedMissions((prev) => [newMission, ...prev]);

    // Automatically stamp verification if not already
    if (!verifiedTargets[activeTarget.id]) {
      handleVerifyTarget(activeTarget.id);
    }

    setDispatchAlert({
      missionId: missionNumber,
      unitName: unitObj.name,
      targetLabel: activeTarget.label,
      etaMin: unitObj.etaMin,
      gps: currentFeed.gps,
    });

    if (onCaseDispatched) {
      onCaseDispatched(newMission);
    }

    // Auto-dismiss alert banner after 8 seconds
    setTimeout(() => {
      setDispatchAlert(null);
    }, 8000);
  };

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", width: "100%", paddingBottom: "24px" }}>
      {/* Top Header & Context */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--red-zone)", marginBottom: "4px" }}>
            Edge AI Surveillance & Tactical Authorization Desk
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.55rem", fontWeight: 700, margin: 0, color: "var(--text-headline)" }}>
            🚁 Live Drone AI Video Feed & Tactical Rescue Dispatch Desk
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "4px 0 0", maxWidth: "880px" }}>
            Ingest live aerial drone video telemetry (Optical RGB or Thermal Infrared), review AI-generated bounding box detections in real time, verify coordinates, and authorize 1-click rescue team dispatches to the field.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="file"
            accept="video/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "7px 14px",
              background: "#FFFFFF",
              color: "var(--text-headline)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            📹 Upload Drone Video Stream
          </button>
        </div>
      </div>

      {/* Dispatch Success Alert Banner */}
      {dispatchAlert && (
        <div
          style={{
            background: "linear-gradient(90deg, #ECFDF5 0%, #FFFFFF 100%)",
            border: "2px solid #10B981",
            borderRadius: "var(--radius-lg)",
            padding: "12px 18px",
            marginBottom: "16px",
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.8rem" }}>🚀</span>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#065F46", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                MISSION AUTHORIZED: {dispatchAlert.missionId}
              </div>
              <strong style={{ fontSize: "0.95rem", color: "#064E3B" }}>
                Dispatched {dispatchAlert.unitName} to {dispatchAlert.targetLabel}
              </strong>
              <div style={{ fontSize: "0.75rem", color: "#047857" }}>
                Target Coordinates: <strong>{dispatchAlert.gps}</strong> | Calculated Arrival: <strong>⏱️ {dispatchAlert.etaMin} Minutes</strong>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const m = dispatchedMissions.find((m) => m.missionId === dispatchAlert.missionId) || dispatchedMissions[0];
              setActiveManifestMission(m);
              setShowManifestModal(true);
            }}
            style={{
              padding: "6px 14px",
              background: "#065F46",
              color: "#FFFFFF",
              borderRadius: "var(--radius-sm)",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🖨️ Print Dispatch Manifest
          </button>
        </div>
      )}

      {/* Preset Stream Selector Ribbon */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "10px 16px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span className="eyebrow" style={{ color: "var(--text-headline)", fontSize: "0.72rem" }}>
            Tactical Surveillance Feeds:
          </span>
          {feedList.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setCustomVideoUrl(null);
                setSelectedFeedId(f.id);
              }}
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-sm)",
                border: selectedFeedId === f.id && !customVideoUrl ? "1.5px solid var(--accent-blue)" : "1px solid var(--border)",
                background: selectedFeedId === f.id && !customVideoUrl ? "var(--bg-tertiary)" : "#FFFFFF",
                color: selectedFeedId === f.id && !customVideoUrl ? "var(--accent-blue)" : "var(--text-headline)",
                fontWeight: selectedFeedId === f.id && !customVideoUrl ? 700 : 500,
                fontSize: "0.76rem",
                cursor: "pointer",
              }}
            >
              {f.title.split(":")[0]}
            </button>
          ))}

          {customVideoUrl && (
            <span style={{ fontSize: "0.75rem", background: "#FEF3C7", color: "#92400E", padding: "4px 8px", borderRadius: "4px", fontWeight: 700 }}>
              📹 Custom Upload: {customFileName}
            </span>
          )}
        </div>

        {/* Optical vs Thermal Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-secondary)", padding: "3px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
          <button
            onClick={() => setVisionMode("thermal")}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: visionMode === "thermal" ? "#0F172A" : "transparent",
              color: visionMode === "thermal" ? "#00E5FF" : "var(--text-headline)",
              fontWeight: visionMode === "thermal" ? 700 : 500,
              fontSize: "0.74rem",
              cursor: "pointer",
            }}
          >
            🌡️ Thermal IR (LWIR)
          </button>
          <button
            onClick={() => setVisionMode("optical")}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: visionMode === "optical" ? "#0F172A" : "transparent",
              color: visionMode === "optical" ? "#FFFFFF" : "var(--text-headline)",
              fontWeight: visionMode === "optical" ? 700 : 500,
              fontSize: "0.74rem",
              cursor: "pointer",
            }}
          >
            📸 Daylight Optical (RGB)
          </button>
        </div>
      </div>

      {/* Main Console Grid: Video Player (Left) + Officer Verification & Dispatch (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: "16px", marginBottom: "18px" }}>
        
        {/* LEFT COLUMN: Interactive Drone Video Canvas with Bounding Boxes */}
        <div
          style={{
            background: "#0F172A",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            border: "1px solid #1E293B",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-md)",
            position: "relative",
          }}
        >
          {/* Top Drone Telemetry HUD Strip */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.9)",
              padding: "8px 14px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.72rem",
              color: "#94A3B8",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#EF4444", fontWeight: 800, display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444", display: "inline-block", boxShadow: "0 0 8px #EF4444" }} />
                LIVE REC
              </span>
              <span>UAV: <strong>NDRF-EAGLE-04</strong></span>
              <span>ALT: <strong>{currentFeed.altitude}</strong></span>
              <span>GIMBAL: <strong>{currentFeed.gimbal}</strong></span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>LINK: <strong style={{ color: "#10B981" }}>-84 dBm (LoRa)</strong></span>
              <span>BATTERY: <strong style={{ color: "#38BDF8" }}>82% (24m Rem)</strong></span>
            </div>
          </div>

          {/* Video / Synthetic Visual Canvas */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "440px",
              background: visionMode === "thermal"
                ? "radial-gradient(ellipse at center, #1E1B4B 0%, #0F172A 70%, #020617 100%)"
                : "linear-gradient(180deg, #334155 0%, #1E293B 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Custom Video Element if Uploaded */}
            {customVideoUrl ? (
              <video
                src={customVideoUrl}
                autoPlay={isPlaying}
                loop
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: visionMode === "thermal" ? "invert(0.8) hue-rotate(180deg) contrast(1.4)" : "none",
                }}
              />
            ) : (
              /* High-Tech Tactical Drone Background Graphics */
              <div style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.85 }}>
                {/* Crosshairs & Compass Grid */}
                <div style={{ position: "absolute", top: "50%", left: "50%", width: "60px", height: "60px", transform: "translate(-50%, -50%)", border: "1px dashed rgba(56, 189, 248, 0.4)", borderRadius: "50%" }} />
                <div style={{ position: "absolute", top: "50%", left: "0", right: "0", height: "1px", background: "rgba(56, 189, 248, 0.15)" }} />
                <div style={{ position: "absolute", left: "50%", top: "0", bottom: "0", width: "1px", background: "rgba(56, 189, 248, 0.15)" }} />
                
                {/* Terrain Terrain Texture Mock */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: visionMode === "thermal"
                      ? "radial-gradient(circle at 45% 50%, rgba(220, 38, 38, 0.35) 0%, rgba(217, 119, 6, 0.2) 20%, rgba(30, 27, 75, 0) 60%)"
                      : "linear-gradient(45deg, #1E293B 25%, #334155 50%, #1E293B 75%)",
                    filter: "blur(4px)",
                  }}
                />
              </div>
            )}

            {/* AI Bounding Box Overlays */}
            {currentFeed.targets.map((tgt) => {
              const isSelected = tgt.id === selectedTargetId;
              const isVerified = !!verifiedTargets[tgt.id];
              const isDismissed = !!dismissedTargets[tgt.id];

              if (isDismissed) return null;

              return (
                <div
                  key={tgt.id}
                  onClick={() => setSelectedTargetId(tgt.id)}
                  style={{
                    position: "absolute",
                    left: `${tgt.box.x}%`,
                    top: `${tgt.box.y}%`,
                    width: `${tgt.box.w}%`,
                    height: `${tgt.box.h}%`,
                    border: isVerified
                      ? "2px solid #10B981"
                      : isSelected
                      ? "2px solid #00E5FF"
                      : "2px dashed #EF4444",
                    borderRadius: "4px",
                    background: isSelected
                      ? "rgba(0, 229, 255, 0.12)"
                      : "rgba(239, 68, 68, 0.08)",
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 0 16px rgba(0, 229, 255, 0.4)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Pulsing Corner Reticles */}
                  <div style={{ position: "absolute", top: -4, left: -4, width: 8, height: 8, borderTop: "2px solid #FFF", borderLeft: "2px solid #FFF" }} />
                  <div style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderTop: "2px solid #FFF", borderRight: "2px solid #FFF" }} />
                  <div style={{ position: "absolute", bottom: -4, left: -4, width: 8, height: 8, borderBottom: "2px solid #FFF", borderLeft: "2px solid #FFF" }} />
                  <div style={{ position: "absolute", bottom: -4, right: -4, width: 8, height: 8, borderBottom: "2px solid #FFF", borderRight: "2px solid #FFF" }} />

                  {/* AI Detection Label Pill */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: 0,
                      marginBottom: "4px",
                      background: isVerified ? "#065F46" : isSelected ? "#0F172A" : "rgba(15, 23, 42, 0.9)",
                      color: isVerified ? "#34D399" : isSelected ? "#00E5FF" : "#FFF",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "0.68rem",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      border: isSelected ? "1px solid #00E5FF" : "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {isVerified ? "✓ APPROVED" : `[AI] ${tgt.label.toUpperCase()}`} ({tgt.confidence}%)
                    {visionMode === "thermal" && tgt.type === "human" && ` | ${tgt.tempC}°C`}
                  </div>
                </div>
              );
            })}

            {/* Live Targeting Crosshair in Center */}
            <div style={{ position: "absolute", pointerEvents: "none", color: "rgba(255, 255, 255, 0.4)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
              <span>+</span>
            </div>

            {/* Bottom Left Telemetry OSD */}
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                left: "14px",
                background: "rgba(15, 23, 42, 0.8)",
                backdropFilter: "blur(6px)",
                padding: "6px 10px",
                borderRadius: "4px",
                fontSize: "0.7rem",
                color: "#E2E8F0",
                fontFamily: "var(--font-mono)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div>LOCATION: <strong>{currentFeed.location}</strong></div>
              <div>COORDINATES: <strong style={{ color: "#38BDF8" }}>{currentFeed.gps}</strong></div>
            </div>
          </div>

          {/* Video Control Bar */}
          <div
            style={{
              padding: "8px 14px",
              background: "#0F172A",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  background: "#1E293B",
                  color: "#FFF",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                }}
              >
                {isPlaying ? "⏸️ Pause Feed" : "▶️ Resume Feed"}
              </button>

              <span style={{ color: "#64748B", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
                Sampling: 1.0 FPS Edge Inference
              </span>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              {currentFeed.targets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTargetId(t.id)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "3px",
                    fontSize: "0.68rem",
                    border: "none",
                    background: selectedTargetId === t.id ? "#0284C7" : "#1E293B",
                    color: "#FFF",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  🎯 {t.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Officer-in-the-Loop Human Verification & Rescue Dispatch Terminal */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {activeTarget ? (
            <div>
              {/* Header: Target ID & Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                <div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    ACTIVE TARGET INSPECTION
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", margin: "2px 0", color: "var(--text-headline)" }}>
                    {activeTarget.label} ({activeTarget.id})
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Sector: <strong>{currentFeed.location}</strong>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "10px",
                    background: isTargetVerified ? "#DCFCE7" : isTargetDismissed ? "#FEE2E2" : "#FEF3C7",
                    color: isTargetVerified ? "#15803D" : isTargetDismissed ? "#DC2626" : "#B45309",
                  }}
                >
                  {isTargetVerified ? "✅ OFFICER APPROVED" : isTargetDismissed ? "❌ DISMISSED" : "⏳ PENDING OFFICER SIGN-OFF"}
                </span>
              </div>

              {/* Target Telemetry Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                <div style={{ background: "var(--bg-secondary)", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>Target Ground GPS</div>
                  <strong style={{ fontSize: "0.78rem", color: "var(--text-headline)", fontFamily: "var(--font-mono)" }}>{currentFeed.gps}</strong>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>AI Confidence</div>
                  <strong style={{ fontSize: "0.85rem", color: "#0284C7", fontFamily: "var(--font-mono)" }}>{activeTarget.confidence}% (YOLO-SAR)</strong>
                </div>

                {activeTarget.type === "human" && (
                  <>
                    <div style={{ background: "#FEF2F2", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid #FECACA" }}>
                      <div style={{ fontSize: "0.66rem", color: "#991B1B" }}>Thermal Body Temp</div>
                      <strong style={{ fontSize: "0.85rem", color: "#DC2626", fontFamily: "var(--font-mono)" }}>{activeTarget.tempC}°C (Living)</strong>
                    </div>

                    <div style={{ background: "#FFFBEB", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid #FDE68A" }}>
                      <div style={{ fontSize: "0.66rem", color: "#92400E" }}>Stillness Telemetry</div>
                      <strong style={{ fontSize: "0.85rem", color: "#D97706", fontFamily: "var(--font-mono)" }}>⏱️ {activeTarget.stillnessSec}s Motionless</strong>
                    </div>
                  </>
                )}
              </div>

              {/* Notes & Description */}
              <div style={{ background: "var(--bg-tertiary)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(2, 132, 199, 0.2)", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--accent-blue)", fontWeight: 700 }}>FIELD ANNOTATION CONTEXT</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-headline)", marginTop: "2px" }}>
                  {activeTarget.notes}
                </div>
              </div>

              {/* Officer Verification Stamp Box */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "8px", fontWeight: 600 }}>
                  STEP 1: OFFICER-IN-THE-LOOP VERIFICATION
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleVerifyTarget(activeTarget.id)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: isTargetVerified ? "#059669" : "#10B981",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    {isTargetVerified ? "✓ Stamped by Officer #402" : "✅ Verify & Approve Annotation"}
                  </button>
                  <button
                    onClick={() => handleDismissTarget(activeTarget.id)}
                    style={{
                      padding: "8px 12px",
                      background: "#F1F5F9",
                      color: "#64748B",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 600,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    ❌ Dismiss
                  </button>
                </div>
              </div>

              {/* Rescue Unit Selection & 1-Click Dispatch */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "8px", fontWeight: 600 }}>
                  STEP 2: SELECT RESCUE UNIT TO DISPATCH
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                  {RESCUE_UNITS.map((u) => (
                    <label
                      key={u.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: selectedRescueUnit === u.id ? "1.5px solid #0284C7" : "1px solid var(--border)",
                        background: selectedRescueUnit === u.id ? "var(--bg-tertiary)" : "#FFFFFF",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="radio"
                          name="rescueUnit"
                          checked={selectedRescueUnit === u.id}
                          onChange={() => setSelectedRescueUnit(u.id)}
                        />
                        <span style={{ fontWeight: 600, color: "var(--text-headline)" }}>{u.name}</span>
                      </div>
                      <span className="mono" style={{ color: "var(--accent-blue)", fontWeight: 700, fontSize: "0.72rem" }}>
                        ⏱️ ETA {u.etaMin}m
                      </span>
                    </label>
                  ))}
                </div>

                {/* 1-Click Dispatch Button */}
                <button
                  onClick={handleDispatchRescue}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "#0F172A",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "var(--radius)",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  🚀 DISPATCH RESCUE TEAM TO TARGET COORDINATES
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              Select a target bounding box on the video canvas to inspect and authorize dispatch.
            </div>
          )}
        </div>
      </div>

      {/* Dispatched Missions Live Log & Tracking Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "18px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--safe)" }}>Live Field Operations</div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: 0, color: "var(--text-headline)" }}>
              📋 Active NDRF Tactical Rescue Missions ({dispatchedMissions.length})
            </h3>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Synchronized via LoRa Radio Mesh
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "8px 10px" }}>Mission ID</th>
                <th style={{ padding: "8px 10px" }}>Target Casualty / Hazard</th>
                <th style={{ padding: "8px 10px" }}>Dispatched Unit</th>
                <th style={{ padding: "8px 10px" }}>Target GPS</th>
                <th style={{ padding: "8px 10px" }}>Time</th>
                <th style={{ padding: "8px 10px" }}>ETA</th>
                <th style={{ padding: "8px 10px" }}>Authorizing Officer</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Manifest</th>
              </tr>
            </thead>
            <tbody>
              {dispatchedMissions.map((m) => (
                <tr key={m.missionId} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 10px" }} className="mono">
                    <strong style={{ color: "#0284C7" }}>{m.missionId}</strong>
                  </td>
                  <td style={{ padding: "8px 10px" }}>{m.targetLabel}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{m.unit}</td>
                  <td style={{ padding: "8px 10px" }} className="mono">{m.gps}</td>
                  <td style={{ padding: "8px 10px" }}>{m.dispatchedAt}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ color: "#15803D", background: "#DCFCE7", padding: "2px 6px", borderRadius: "10px", fontWeight: 700 }}>
                      ⏱️ {m.etaMin}m
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>{m.officer}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    <button
                      onClick={() => {
                        setActiveManifestMission(m);
                        setShowManifestModal(true);
                      }}
                      style={{
                        padding: "3px 8px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      🖨️ Manifest
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Dispatch Manifest Modal */}
      {showManifestModal && activeManifestMission && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowManifestModal(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "var(--radius-xl)",
              maxWidth: "680px",
              width: "100%",
              padding: "24px",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ borderBottom: "2px solid #0F172A", paddingBottom: "12px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#0284C7", fontWeight: 700 }}>
                  NATIONAL DISASTER RESPONSE FORCE (NDRF) · TACTICAL DISPATCH ORDER
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", margin: "2px 0", color: "#0F172A" }}>
                  Official Field Mission Authorization: {activeManifestMission.missionId}
                </h3>
              </div>
              <button
                onClick={() => setShowManifestModal(false)}
                style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Manifest Details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.8rem", marginBottom: "18px" }}>
              <div><strong>Target:</strong> {activeManifestMission.targetLabel}</div>
              <div><strong>Target GPS:</strong> <span className="mono">{activeManifestMission.gps}</span></div>
              <div><strong>Dispatched Unit:</strong> {activeManifestMission.unit}</div>
              <div><strong>Authorizing Officer:</strong> {activeManifestMission.officer}</div>
              <div><strong>Dispatched Time:</strong> {activeManifestMission.dispatchedAt}</div>
              <div><strong>Calculated ETA:</strong> {activeManifestMission.etaMin} Minutes</div>
            </div>

            {/* Signatures */}
            <div style={{ borderTop: "1px dashed #CBD5E1", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.72rem", color: "#64748B" }}>
                Authorized under Section 34 of the Disaster Management Act, 2005.
              </span>
              <button
                onClick={() => window.print()}
                style={{
                  padding: "6px 14px",
                  background: "#0F172A",
                  color: "#FFF",
                  borderRadius: "var(--radius)",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.76rem",
                  cursor: "pointer",
                }}
              >
                🖨️ Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
