function calculateRequiredAccuracy(playerLevel, monsterLevel, monsterEva) {

  let D = monsterLevel - playerLevel;
  if (D < 0) D = 0;

  const avoid = monsterEva <= 0 ? 1 : monsterEva;

  const requiredAccuracy =
    101 * (1.84 + 0.07 * D) * avoid;

  return requiredAccuracy;
}

function calculateHitRate(playerLevel, playerAccuracy, monsterLevel, monsterEva) {

  let D = monsterLevel - playerLevel;
  if (D < 0) D = 0;

  const avoid = monsterEva <= 0 ? 1 : monsterEva;

  const hitRate =
    (playerAccuracy / ((1.84 + 0.07 * D) * avoid)) - 1;

  return Math.max(0, Math.min(100, hitRate));
}

let monsters = {};

// DOM elements (IMPORTANT)
const monsterSelect = document.getElementById("monsterSelect");
const monsterInfo = document.getElementById("monsterInfo");
const monsterImage = document.getElementById("monsterImage");

const playerLevelInput = document.getElementById("playerLevel");
const playerAccuracyInput = document.getElementById("playerAccuracy");

const hitRateDisplay = document.getElementById("hitRateDisplay");
const requiredAccuracyDisplay = document.getElementById("requiredAccuracyDisplay");

// Main update function
function updateCalculator() {

  const selectedMonsterId = monsterSelect.value;

  if (selectedMonsterId === "") {
    monsterImage.src = "";
    monsterInfo.innerHTML = "";
    hitRateDisplay.innerHTML = "";
    requiredAccuracyDisplay.innerHTML = "";
    return;
  }

  const monster = monsters[selectedMonsterId];

  const playerLevel = Number(playerLevelInput.value);
  const playerAccuracy = Number(playerAccuracyInput.value);

  // Update monster image
  monsterImage.src = `mob_images/${selectedMonsterId}.png`;

  // Update monster info
  monsterInfo.innerHTML = `
    <h2>${monster.name}</h2>
    <p>Level: ${monster.level}</p>
    <p>EVA: ${monster.eva}</p>
  `;

  // Hit rate
  const hitRate = calculateHitRate(
    playerLevel,
    playerAccuracy,
    monster.level,
    monster.eva
  );

  hitRateDisplay.innerHTML = `
    <h3>Hit Rate: ${hitRate.toFixed(2)}%</h3>
  `;

  // Required accuracy
  const requiredAccuracy = calculateRequiredAccuracy(
    playerLevel,
    monster.level,
    monster.eva
  );

  requiredAccuracyDisplay.innerHTML = `
    <h3>Accuracy Needed for 100%: ${requiredAccuracy.toFixed(2)}</h3>
  `;
}

// Load JSON
fetch("monsterEVA.json")
  .then(response => response.json())
  .then(data => {
    monsters = data;

    console.log("Monsters loaded:", monsters);

    // Populate dropdown
    for (const monsterId in monsters) {
      const monster = monsters[monsterId];

      const option = document.createElement("option");
      option.value = monsterId;
      option.textContent = monster.name;

      monsterSelect.appendChild(option);
    }

    // Event listeners
    monsterSelect.addEventListener("change", updateCalculator);
    playerLevelInput.addEventListener("input", updateCalculator);
    playerAccuracyInput.addEventListener("input", updateCalculator);
  })
  .catch(error => {
    console.error("Failed to load monster data:", error);
  });