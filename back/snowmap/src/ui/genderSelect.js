import { loadSavedGender, saveGender } from "../character/gender.js";

/**
 * 성별 선택 UI + localStorage.
 * @param {(gender: "boy"|"girl") => void} onChange
 */
export function createGenderSelect(onChange) {
  let el = document.getElementById("gender");
  if (!el) {
    el = document.createElement("select");
    el.id = "gender";
    el.setAttribute("aria-label", "캐릭터 성별");
    el.innerHTML = `
      <option value="boy">남자</option>
      <option value="girl">여자</option>
    `;
    document.body.appendChild(el);
  }

  const current = loadSavedGender();
  el.value = current;

  el.addEventListener("change", () => {
    const gender = el.value === "girl" ? "girl" : "boy";
    saveGender(gender);
    onChange?.(gender);
  });

  return {
    get value() {
      return el.value === "girl" ? "girl" : "boy";
    },
    setValue(gender) {
      el.value = gender === "girl" ? "girl" : "boy";
    },
    el,
  };
}
