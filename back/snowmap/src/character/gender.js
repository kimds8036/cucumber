import { CONFIG } from "../config.js";

/** @returns {"boy"|"girl"} */
export function loadSavedGender() {
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
  try {
    localStorage.setItem(CONFIG.GENDER_STORAGE_KEY, gender);
  } catch {
    /* ignore */
  }
}
