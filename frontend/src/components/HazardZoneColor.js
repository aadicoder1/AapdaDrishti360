// components/HazardZoneColor.js
// Single source of truth for color scales, status palettes, and plain-English risk explanations.

export function zoneColor(level) {
  switch (level) {
    case "Red Zone":
      return "#DC2626";
    case "Warning":
      return "#EA580C";
    case "Watch":
      return "#D97706";
    default:
      return "#0D9488";
  }
}

export function zoneBg(level) {
  switch (level) {
    case "Red Zone":
      return "rgba(220, 38, 38, 0.12)";
    case "Warning":
      return "rgba(234, 88, 12, 0.12)";
    case "Watch":
      return "rgba(217, 119, 6, 0.12)";
    default:
      return "rgba(13, 148, 136, 0.12)";
  }
}

export function zoneBorder(level) {
  switch (level) {
    case "Red Zone":
      return "rgba(220, 38, 38, 0.35)";
    case "Warning":
      return "rgba(234, 88, 12, 0.35)";
    case "Watch":
      return "rgba(217, 119, 6, 0.35)";
    default:
      return "rgba(13, 148, 136, 0.35)";
  }
}

export function verificationColor(status) {
  if (!status) return "#64748B";
  const s = status.toUpperCase();
  if (s.includes("BLOCKED")) return "#DC2626";
  if (s.includes("CLEAR")) return "#16A34A";
  return "#64748B";
}

export const PRIORITY_COLOR = {
  CRITICAL: "#DC2626",
  HIGH: "#EA580C",
  MEDIUM: "#D97706",
  LOW: "#64748B",
};

export const PRIORITY_BG = {
  CRITICAL: "rgba(220, 38, 38, 0.12)",
  HIGH: "rgba(234, 88, 12, 0.12)",
  MEDIUM: "rgba(217, 119, 6, 0.12)",
  LOW: "rgba(100, 116, 139, 0.12)",
};


/**
 * Explains in clear, plain English what each risk category signifies for command decision makers.
 */
export function explainRiskLevel(level) {
  switch (level) {
    case "Red Zone":
      return "Imminent or active high hazard exposure. Overlaps historical landslide/cloudburst buffer zone with severe terrain instability. Priority 1 pre-emption & relocation required.";
    case "Warning":
      return "Elevated risk threshold. Proximity to active catchment/hazard corridors with moderate slope vulnerability. Monitored for immediate evacuation trigger.";
    case "Watch":
      return "Precautionary status. Peripheral hazard proximity with low-to-moderate baseline vulnerability. Evacuation routes and reception centers on standby.";
    case "Safe":
    default:
      return "Baseline low hazard exposure. Beyond direct historical hazard buffers with stable topographical index. Suitable for shelter reception or normal operations.";
  }
}
