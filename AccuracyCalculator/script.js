/* =========================================================
   1. CORE CALCULATION LOGIC
   ========================================================= */

function getAcc100(monsterLevel, monsterAvoid, playerLevel) {
  const diff = Math.max(0, monsterLevel - playerLevel);

  return (55.2 + 2.15 * diff) * (monsterAvoid / 15);
}

function calculateHitRate(playerAccuracy, acc100) {
  const raw = ((2 * playerAccuracy) / acc100 - 1) * 100;

  return Math.max(0, Math.min(100, raw));
}

/* =========================================================
   2. STATE
   ========================================================= */

let monsters = {};
let currentSortMode = "id";

/* =========================================================
   3. CACHE DOM ELEMENTS
   ========================================================= */

const el = {
  search: document.getElementById("monsterSearch"),
  select: document.getElementById("monsterSelect"),

  info: document.getElementById("monsterInfo"),
  image: document.getElementById("monsterImage"),

  sortId: document.getElementById("sortById"),
  sortLevel: document.getElementById("sortByLevel"),

  level: document.getElementById("playerLevel"),
  accuracy: document.getElementById("playerAccuracy"),

  hitRate: document.getElementById("hitRateDisplay"),
  required: document.getElementById("requiredAccuracyDisplay")
};

/* =========================================================
   4. SORT UI
   ========================================================= */

function setActiveSort(activeBtn) {
  document.querySelectorAll("#sortButtons button")
    .forEach(btn => btn.classList.remove("active"));

  activeBtn.classList.add("active");
}

/* =========================================================
   5. INPUT HELPERS (+ / -)
   ========================================================= */

function changeValue(id, delta) {
  const input = document.getElementById(id);

  const value = Math.max(0, (Number(input.value) || 0) + delta);

  input.value = value;

  updateCalculator();
}

/* attach +/- buttons */
document.querySelectorAll(".plus").forEach(btn =>
  btn.addEventListener("click", () =>
    changeValue(btn.dataset.target, 1)
  )
);

document.querySelectorAll(".minus").forEach(btn =>
  btn.addEventListener("click", () =>
    changeValue(btn.dataset.target, -1)
  )
);

/* strict number-only input */
document.querySelectorAll('input[type="number"]').forEach(input => {

  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
  });

});

/* =========================================================
   6. MONSTER LIST RENDERING
   ========================================================= */

function populateMonsterDropdown(filter = "") {
  const prev = el.select.value;
  const search = filter.toLowerCase();

  el.select.innerHTML = "";

  let entries = Object.entries(monsters);

  // sorting
  entries.sort((a, b) =>
    currentSortMode === "level"
      ? a[1].level - b[1].level
      : Number(a[0]) - Number(b[0])
  );

  // build list
  for (const [id, monster] of entries) {
    if (!monster.name.toLowerCase().includes(search)) continue;

    const option = document.createElement("option");
    option.value = id;
    option.textContent = `[Lv. ${monster.level}] ${monster.name}`;

    el.select.appendChild(option);
  }

  // restore selection
  el.select.value = monsters[prev] ? prev : el.select.options[0]?.value;

  updateCalculator();
}

/* =========================================================
   7. MAIN UI UPDATE
   ========================================================= */

function updateCalculator() {
  const id = el.select.value;

  if (!id) {
    el.image.src = "";
    el.info.innerHTML = "";
    el.hitRate.innerHTML = "";
    el.required.innerHTML = "";
    return;
  }

  const m = monsters[id];

  const playerLevel = Number(el.level.value) || 0;
  const playerAccuracy = Number(el.accuracy.value) || 0;

  el.image.src = `mob_images/${id}.png`;

  el.info.innerHTML = `
    <h2>${m.name}</h2>
    <p><span class="stat stat-level">Level: ${m.level}</span></p>
    <p><span class="stat stat-evade">Avoid: ${m.eva}</span></p>
  `;

  const acc100 = getAcc100(m.level, m.eva, playerLevel);
  const hitRate = calculateHitRate(playerAccuracy, acc100);

  el.hitRate.innerHTML = `
    <h3>Hit Rate: <strong>${hitRate.toFixed(2)}%</strong></h3>
  `;

  el.required.innerHTML = `
    <h3>Accuracy for 100%: <strong>${Math.ceil(acc100)}</strong></h3>
  `;
}

/* =========================================================
   8. INITIALIZE APP
   ========================================================= */

fetch(`monsterEVA.json?v=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    monsters = data;

    populateMonsterDropdown();

    el.select.addEventListener("change", updateCalculator);
    el.level.addEventListener("input", updateCalculator);
    el.accuracy.addEventListener("input", updateCalculator);

    el.search.addEventListener("input", () =>
      populateMonsterDropdown(el.search.value)
    );

    el.sortId.addEventListener("click", () => {
      currentSortMode = "id";
      setActiveSort(el.sortId);
      populateMonsterDropdown(el.search.value);
    });

    el.sortLevel.addEventListener("click", () => {
      currentSortMode = "level";
      setActiveSort(el.sortLevel);
      populateMonsterDropdown(el.search.value);
    });
  })
  .catch(console.error);