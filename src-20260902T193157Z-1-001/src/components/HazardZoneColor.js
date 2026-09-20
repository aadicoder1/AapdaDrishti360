// components/HazardZoneColor.js
// Single place that maps red_zone_level -> color, so map markers,
// list badges, and legends never drift out of sync with each other.

export function zoneColor(level) {
  switch (level) {
    case "Red Zone":
      return "var(--red-zone)";
    case "Warning":
      return "var(--warning)";
    case "Watch":
      return "var(--watch)";
    default:
      return "var(--safe)";
  }
}

export function verificationColor(status) {
  if (status?.includes("BLOCKED")) return "var(--verified-blocked)";
  if (status?.includes("CLEAR")) return "var(--verified-clear)";
  return "var(--unverified)";
}