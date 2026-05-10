function getAcc100(monsterLevel, monsterAvoid, playerLevel) {

  let diff = monsterLevel - playerLevel;
  if (diff < 0) diff = 0;

  return (55.2 + 2.15 * diff) * (monsterAvoid / 15.0);
}

function calculateHitRate(playerAccuracy, acc100) {

  const acc1 = acc100 * 0.5 + 1;

  const AccPart = (playerAccuracy - acc1 + 1) / (acc100 - acc1 + 1);

  let hitRate =
    (-0.7011618132 * Math.pow(AccPart, 2)) +
    (1.702139835 * AccPart);

  hitRate *= 100;

  return Math.max(0, Math.min(100, hitRate));
}

let monsters = {};

// DOM elements
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

  // Calculate acc100
  const acc100 = getAcc100(
    monster.level,
    monster.eva,
    playerLevel
  );

  // Calculate hit rate
  const hitRate = calculateHitRate(
    playerAccuracy,
    acc100
  );

  // Display results
  hitRateDisplay.innerHTML = `
    <h3>Hit Rate: ${hitRate.toFixed(2)}%</h3>
  `;

  requiredAccuracyDisplay.innerHTML = `
    <h3>Accuracy Needed for 100%: ${Math.round(acc100)}</h3>
  `;
}

// Load monsters
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

    // Auto-update events
    monsterSelect.addEventListener("change", updateCalculator);
    playerLevelInput.addEventListener("input", updateCalculator);
    playerAccuracyInput.addEventListener("input", updateCalculator);
  })
  .catch(error => {
    console.error("Failed to load monster data:", error);
  });