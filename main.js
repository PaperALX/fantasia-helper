// ==============================
// MONSTER DATA STORAGE
// ==============================
let monsters = [];
let monsterMap = new Map(); // O(1) lookup by monster name
let dropMap = {};           // dropNameLower -> array of monsters

// ==============================
// BACK BUTTON HISTORY
// ==============================
let historyStack = [];
let currentResult = null;

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
// BACK BUTTON
// ==============================
const backButton = document.getElementById('backButton');

backButton.addEventListener('click', () => {
  if (!historyStack.length) return;

  const previous = historyStack.pop();
  showResult(previous, true);
});

// ==============================
// LOAD MONSTER DATA & BUILD DROP MAP
// ==============================
fetch(`data/monsters.json?v=${Date.now()}`)
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(data => {
    monsters = data.map(normalizeMonster);
    monsters.forEach(m => monsterMap.set(m.name, m));

    // Build drop map for fast item lookup (normal + hidden drops)
    dropMap = {};
    monsters.forEach(m => {
      // Normal drops
      m.dropsLower.forEach((dLower) => {
        if (!dropMap[dLower]) dropMap[dLower] = [];
        dropMap[dLower].push(m);
      });
      // Hidden drops
      m.hiddenLower.forEach((dLower) => {
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
// HELPER: PARSE ELEMATTR STRING
// ==============================
function parseElemAttr(elemAttr) {
  if (!elemAttr) return [];
  const elements = [];
  const elementMap = {
    'F': 'Fire',
    'S': 'Poison',
    'H': 'Holy',
    'I': 'Ice',
    'L': 'Lightning'
  };
  const statusMap = {
    '1': 'Immune',
    '2': 'Resist',
    '3': 'Weak'
  };

  for (let i = 0; i < elemAttr.length; i += 2) {
    const code = elemAttr[i];
    const value = elemAttr[i + 1];
    if (elementMap[code] && statusMap[value]) {
      elements.push({
        element: elementMap[code],
        status: statusMap[value]
      });
    }
  }
  return elements;
}

// ==============================
// HELPER: NORMALIZE MONSTER OBJECT
// ==============================
function normalizeMonster(m) {
  const elements = parseElemAttr(m.elemAttr || '');
  return {
    name: m.name || "Unknown",
    nameLower: (m.name || "").toLowerCase(),
    image: m.image || "",
    level: Number(m.level) || 0,
    hp: Number(m.hp) || 0,
    mp: Number(m.mp) || 0,
    exp: Number(m.exp) || 0,
    drops: Array.isArray(m.drops) ? m.drops : [],
    dropsLower: Array.isArray(m.drops) ? m.drops.map(d => d.toLowerCase()) : [],
    hidden: Array.isArray(m.hidden) ? m.hidden : [],
    hiddenLower: Array.isArray(m.hidden) ? m.hidden.map(d => d.toLowerCase()) : [],
    notes: m.notes || "",
    episode: m.episode || "",
    // Elemental traits
    elements: elements,
    healWeak: Boolean(m.undead),
    // Other stats
    speed: Number(m.speed) || 0,
    PADamage: Number(m.PADamage) || 0,
    PDDamage: Number(m.PDDamage) || 0,
    MADamage: Number(m.MADamage) || 0,
    MDDamage: Number(m.MDDamage) || 0,
    acc: Number(m.acc) || 0,
    eva: Number(m.eva) || 0,
    pushed: Number(m.pushed) || 0
  };
}

// ==============================
// AUTOCOMPLETE INPUT (DEBOUNCED)
// ==============================
let debounceTimer;
searchInput.addEventListener('input', () => {
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

  // Match monster names
  monsters.forEach(m => {
    if (m.nameLower.includes(term)) names.add(m.name);
  });

  // Match drops using dropMap (now includes hidden drops)
  for (const dropLower in dropMap) {
    if (dropLower.includes(term)) {
      dropMap[dropLower].forEach(m => {
        // Find the original display name (check normal drops first, then hidden)
        let idx = m.dropsLower.indexOf(dropLower);
        if (idx >= 0) {
          names.add(m.drops[idx]);
        } else {
          idx = m.hiddenLower.indexOf(dropLower);
          if (idx >= 0) {
            names.add(m.hidden[idx]);
          }
        }
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
      chooseItem(items[currentIndex >= 0 ? currentIndex : 0]);
      break;
  }
});

function highlightIndex(newIndex) {
  const items = dropdown.querySelectorAll('li');
  items.forEach(i => i.classList.remove('highlight'));
  currentIndex = newIndex;
  if (items[currentIndex]) {
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
function showResult(termRaw, fromHistory = false) {
  window.scrollTo(0, 0);

  // Save current result before navigating
  if (!fromHistory && currentResult !== null && currentResult !== termRaw) {
    historyStack.push(currentResult);
  }

  currentResult = termRaw;
  backButton.style.display = historyStack.length === 0 ? 'none' : 'inline-block';

  // Clear search UI
  searchInput.value = '';
  dropdown.style.display = 'none';
  currentIndex = -1;

  const term = termRaw.toLowerCase();
  resultDiv.innerHTML = '';

  const monster = monsterMap.get(termRaw);
  if (monster) {
    renderMonster(monster);
    attachClickHandlers('.clickable-item');
    return;
  }

  const holders = dropMap[term] || [];
  if (holders.length) {
    renderItem(termRaw, holders);
    attachClickHandlers('.clickable-monster');
    return;
  }

  resultDiv.innerHTML = `<p>No results found for "${termRaw}"</p>`;
}

// ==============================
// RENDER MONSTER PAGE
// ==============================
function renderMonster(monster) {
  // Build trait tags
  const traitParts = [];

  if (monster.healWeak) {
    traitParts.push(`<span class="trait trait-heal">Weak to Heal</span>`);
  }

  monster.elements.forEach(e => {
    let cssClass = '';
    if (e.status === 'Immune') cssClass = 'trait-immune';
    else if (e.status === 'Resist') cssClass = 'trait-resist';
    else if (e.status === 'Weak') cssClass = 'trait-weak';
    traitParts.push(`<span class="trait ${cssClass}">${e.element}: ${e.status}</span>`);
  });

  const traitsHTML = traitParts.length > 0
    ? `<div class="traits">${traitParts.join(' ')}</div>`
    : '';

  // Build "Other Stats" small display
  const otherStatsHTML = `
    <details class="other-stats-toggle">
      <summary>Click for Other Stats</summary>
      <div class="other-stats-grid">
        <span>Speed: ${monster.speed}</span>
        <span>Wep ATK: ${monster.PADamage}</span>
        <span>Wep DEF: ${monster.PDDamage}</span>
        <span>Mag ATK: ${monster.MADamage}</span>
        <span>Mag DEF: ${monster.MDDamage}</span>
        <span>Accuracy: ${monster.acc}</span>
        <span>Avoid: ${monster.eva}</span>
        <span>Knockback: ${monster.pushed}</span>
      </div>
    </details>
  `;

  // Hidden drops section (only if monster.hidden exists and has items)
  const hiddenDropsHTML = monster.hidden.length > 0
    ? `
      <p><strong>Hidden Drops:</strong></p>
      <div class="drops-grid hidden-drops-grid">
        ${monster.hidden.map(d => `
          <div class="drop-item clickable-item" data-name="${d}">
            <img src="item_icons/${itemToFilename(d)}" alt="${d}" class="thumb" onerror="this.style.display='none'">
            <span>${d}</span>
          </div>
        `).join('')}
      </div>
    `
    : '';

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
      ${traitsHTML}
      ${otherStatsHTML}
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

    ${hiddenDropsHTML}

    ${monster.episode ? `
      <div class="episode">
        <div class="episode-text">${monster.episode}</div>
      </div>
    ` : ''}
  `;
}

// ==============================
// RENDER ITEM PAGE
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
// ATTACH CLICK HANDLERS
// ==============================
function attachClickHandlers(selector) {
  resultDiv.querySelectorAll(selector).forEach(el => {
    el.addEventListener('click', () => showResult(el.dataset.name));
  });
}
