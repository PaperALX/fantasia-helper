let monsters = {};

fetch("monsterEVA.json")
  .then(response => response.json())
  .then(data => {
    monsters = data;
    console.log("Monsters loaded:", monsters);
  })
  .catch(error => {
    console.error("Failed to load monster data:", error);
  });