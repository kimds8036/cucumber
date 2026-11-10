import { CONFIG } from "../config.js";

/** @returns {"boy"|"girl"|null} */
function genderFromQuery() {
  try {
    const value = String(
      new URLSearchParams(window.location.search).get("gender") || "",
    )
      .trim()
      .toLowerCase();
    if (value === "girl" || value === "boy") return value;
  } catch {
    /* ignore */
  }
  return null;
}

/** @returns {"boy"|"girl"} */
export function loadSavedGender() {
  const fromQuery = genderFromQuery();
  if (fromQuery) {
    saveGender(fromQuery);
    return fromQuery;
  }
  try {
    const v = localStorage.getItem(CONFIG.GENDER_STORAGE_KEY);
    if (v === "girl" || v === "boy") return v;
  } catch {
    /* ignore */
  }
  return "boy";
}

/** @param {"boy"|"girl"} gender */
export function saveGender(gender) {
  if (gender !== "girl" && gender !== "boy") return;
  try {
    localStorage.setItem(CONFIG.GENDER_STORAGE_KEY, gender);
  } catch {
    /* ignore */
  }
}
