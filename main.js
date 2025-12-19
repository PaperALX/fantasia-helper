// ==============================
// MONSTER DATA STORAGE
// ==============================
let monsters = [];
let monsterMap = new Map(); // O(1) lookup by monster name
let dropMap = {};           // dropNameLower -> array of monsters

// ==============================
// RANDOMIZE HEADER IMAGES
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  randomizeHeaderImages();
});

function randomizeHeaderImages() {
  const headerImages = document.querySelectorAll('.header-icon');
  if (headerImages.length < 2) return;

  const N = 42; // total number of header images

  const oddNumbers = Array.from({ length: Math.ceil(N / 2) }, (_, i) => 2 * i + 1);
  const evenNumbers = Array.from({ length: Math.floor(N / 2) }, (_, i) => 2 * (i + 1));
  const getRandomFromArray = arr => arr[Math.floor(Math.random() * arr.length)];

  headerImages[0].src = `headerimage/header${getRandomFromArray(oddNumbers)}.png`;
  headerImages[1].src = `headerimage/header${getRandomFromArray(evenNumbers)}.png`;
}

// ==============================
// CACHE DOM ELEMENTS
// ==============================
const searchInput = document.getElementById('search');
const dropdown = document.getElementById('dropdown');
const resultDiv = document.getElementById('result');

// ==============================
// LOAD MONSTER DATA & BUILD DROP MAP
// ==============================
fetch(`data/monsters.json?v=${Date.now()}`)
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(data => {
    monsters = data.map(normalizeMonster);
    monsters.forEach(m => monsterMap.set(m.name, m));

    // Build drop map for faster lookup
    dropMap = {};
    monsters.forEach(m => {
      m.dropsLower.forEach((dLower, i) => {
        if (!dropMap[dLower]) dropMap[dLower] = [];
        dropMap[dLower].push(m);
      });
    });

    console.log("Loaded", monsters.length, "monsters");
    console.log("Drop map entries:", Object.keys(dropMap).length);
  })
  .catch(err => {
    resultDiv.innerHTML = `<p style="color:red;">Error loading monsters.json (${err})</p>`;
  });

// ==============================
// HELPER: NORMALIZE MONSTER OBJECT
// ==============================
function normalizeMonster(m) {
  return {
    name: m.name || "Unknown",
    nameLower: (m.name || "").toLowerCase(),
    image: m.image || "",
    level: m.level || 0,
    hp: m.hp || 0,
    mp: m.mp || 0,
    exp: m.exp || 0,
    locations: Array.isArray(m.locations) ? m.locations : [],
    drops: Array.isArray(m.drops) ? m.drops : [],
    dropsLower: Array.isArray(m.drops) ? m.drops.map(d => d.toLowerCase()) : [],
    notes: m.notes || "",
    episode: m.episode || ""
  };
}

// ==============================
// AUTOCOMPLETE INPUT HANDLER WITH DEBOUNCE
// ==============================
let debounceTimer;
searchInput.addEventListener('input', e => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(handleAutocomplete, 150);
});

function handleAutocomplete() {
  const term = searchInput.value.trim().toLowerCase();
  dropdown.innerHTML = '';

  if (!term) {
    dropdown.style.display = 'none';
    return;
  }

  const names = new Set();

  // Check monster names
  monsters.forEach(m => {
    if (m.nameLower.includes(term)) names.add(m.name);
  });

  // Check drops using dropMap (much faster than looping all drops)
  for (const dropLower in dropMap) {
    if (dropLower.includes(term)) {
      dropMap[dropLower].forEach(m => {
        const index = m.dropsLower.indexOf(dropLower);
        if (index >= 0) names.add(m.drops[index]);
      });
    }
  }

  if (!names.size) {
    dropdown.style.display = 'none';
    return;
  }

  const fragment = document.createDocumentFragment();

  names.forEach(name => {
    const li = document.createElement('li');
    li.classList.add('dropdown-item');

    const monster = monsterMap.get(name);
    if (monster && monster.image) {
      li.classList.add('monster');
      const img = document.createElement('img');
      img.src = `mob_icons/${monster.image}`;
      img.className = 'thumb';
      li.appendChild(img);
    } else {
      li.classList.add('item');
      const img = document.createElement('img');
      img.src = `item_icons/${itemToFilename(name)}`;
      img.className = 'thumb';
      img.onerror = () => img.style.display = 'none';
      li.appendChild(img);
    }

    const span = document.createElement('span');
    span.textContent = name;
    li.appendChild(span);

    li.onclick = () => chooseItem(li);

    fragment.appendChild(li);
  });

  dropdown.appendChild(fragment);
  dropdown.style.display = 'block';
  highlightIndex(-1);
}

// ==============================
// KEYBOARD NAVIGATION
// ==============================
let currentIndex = -1;

searchInput.addEventListener('keydown', e => {
  const items = dropdown.querySelectorAll('li');
  if (!items.length) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightIndex((currentIndex + 1) % items.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightIndex((currentIndex - 1 + items.length) % items.length);
      break;
    case 'Enter':
      e.preventDefault();
      if (currentIndex >= 0 && currentIndex < items.length) {
        chooseItem(items[currentIndex]);
        return;
      }
      if (items.length > 0) chooseItem(items[0]);
      break;
  }
});

function highlightIndex(newIndex) {
  const items = dropdown.querySelectorAll('li');
  items.forEach(i => i.classList.remove('highlight'));
  currentIndex = newIndex;
  if (currentIndex >= 0 && currentIndex < items.length) {
    items[currentIndex].classList.add('highlight');
  }
}

// ==============================
// CHOOSE AUTOCOMPLETE ITEM
// ==============================
function chooseItem(li) {
  const name = li.textContent;
  searchInput.value = name;
  dropdown.style.display = 'none';
  showResult(name);
}

// ==============================
// ITEM FILENAME NORMALIZATION
// ==============================
function itemToFilename(itemName) {
  if (!itemName) return '';

  const lower = itemName.toLowerCase().trim();
  if (lower.startsWith("scroll for") && lower.endsWith("100%")) return "scroll-100.png";
  if (lower.startsWith("scroll for") && lower.endsWith("60%")) return "scroll-60.png";
  if (lower.startsWith("scroll for") && lower.endsWith("10%")) return "scroll-10.png";

  return itemName
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[\/\\]+/g, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .toLowerCase() + '.png';
}

// ==============================
// SHOW RESULT
// ==============================
function showResult(termRaw) {
  window.scrollTo(0, 0);
  const term = termRaw.toLowerCase();
  resultDiv.innerHTML = '';

  const monster = monsterMap.get(termRaw);
  if (monster) {
    renderMonster(monster);
    attachClickHandlers('.clickable-item');
    return;
  }

  // Use dropMap for fast lookup
  const holders = dropMap[term] || [];
  if (holders.length) {
    renderItem(termRaw, holders);
    attachClickHandlers('.clickable-monster');
    return;
  }

  resultDiv.innerHTML = `<p>No results found for "${termRaw}"</p>`;
}

// ==============================
// HELPER: RENDER MONSTER
// ==============================
function renderMonster(monster) {
  resultDiv.innerHTML = `
    <div class="monster-header">
      <h2>${monster.name}</h2>
      ${monster.image ? `<img src="mob_icons/${monster.image}" alt="${monster.name}">` : ''}
      <p>
        <span class="stat stat-level">Level: ${monster.level}</span>
        <span class="stat stat-hp">HP: ${monster.hp}</span>
        <span class="stat stat-mp">MP: ${monster.mp}</span>
        <span class="stat stat-exp">EXP: ${monster.exp}</span>
      </p>
    </div>

    ${monster.notes ? `<div class="notes">${monster.notes}</div>` : ''}

    <p><strong>Drops:</strong></p>
    <div class="drops-grid">
      ${monster.drops.map(d => `
        <div class="drop-item clickable-item" data-name="${d}">
          <img src="item_icons/${itemToFilename(d)}" alt="${d}" class="thumb" onerror="this.style.display='none'">
          <span>${d}</span>
        </div>
      `).join('')}
    </div>

    <p><strong>Locations:</strong></p>
    <div class="locations">
      ${monster.locations.map(loc => `<span class="location-chip">${loc}</span>`).join('')}
    </div>

    ${monster.episode ? `
      <div class="episode">
        <div class="episode-text">${monster.episode}</div>
      </div>
    ` : ''}
  `;
}

// ==============================
// HELPER: RENDER ITEM PAGE
// ==============================
function renderItem(termRaw, holders) {
  resultDiv.innerHTML = `
    <h2 style="display:flex; align-items:center; gap:10px;">
      Item: ${termRaw}
      <img src="item_icons/${itemToFilename(termRaw)}" class="thumb" onerror="this.style.display='none'">
    </h2>
    <p><strong>Dropped by:</strong></p>
    <div class="drops-grid monster-list">
      ${holders.map(m => `
        <div class="drop-item clickable-monster" data-name="${m.name}">
          ${m.image ? `<img src="mob_icons/${m.image}" class="thumb">` : ''}
          <span>${m.name}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ==============================
// HELPER: ATTACH CLICK HANDLERS
// ==============================
function attachClickHandlers(selector) {
  resultDiv.querySelectorAll(selector).forEach(el => {
    el.addEventListener('click', () => showResult(el.dataset.name));
  });
}
