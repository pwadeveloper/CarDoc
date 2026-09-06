export type Profile = {
  market: string;
  transmission: string;
  mileage: string;
  unit: string;
  trim: string;
  modifications: string;
  lastServiceDate: string;
  buildPeriod: string;
  configurationRevision: number;
};
export const initialProfile: Profile = {
  market: "Japan",
  transmission: "6-speed automatic",
  mileage: "171713",
  unit: "mi",
  trim: "Standard (owner-reported)",
  modifications:
    "Standard equipment; no modifications reported. Used in Nigeria; owned for four years.",
  lastServiceDate: "2026-08-23",
  buildPeriod: "unknown",
  configurationRevision: 2,
};
export function loadProfile(): Profile {
  try {
    const raw = JSON.parse(
      window.localStorage.getItem("cardoc-profile") || "null",
    );
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      return initialProfile;
    const clean = { ...initialProfile };
    for (const k of Object.keys(initialProfile) as (keyof Profile)[]) {
      if (k === "configurationRevision") continue;
      if (typeof raw[k] === "string") Object.assign(clean, { [k]: raw[k] });
    }
    if (raw.configurationRevision !== 2)
      return {
        ...clean,
        market: initialProfile.market,
        unit: initialProfile.unit,
        trim: initialProfile.trim,
        modifications: initialProfile.modifications,
        lastServiceDate: initialProfile.lastServiceDate,
        configurationRevision: 2,
      };
    return clean;
  } catch {
    return initialProfile;
  }
}
export const reportedService = {
  id: "owner-reported-service-2026-08-23",
  date: "2026-08-23",
  mileage: "",
  unit: "mi",
  title: "Service — owner reported",
  notes:
    "Approximate date: “two weeks ago” as reported on September 6, 2026. Work performed, parts replaced and odometer at service were not specified.",
};
