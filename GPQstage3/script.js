// ============================================================
// GPQ Stage 3 Solver
// A Mastermind-style solver: 4 item types, 4 statue positions,
// duplicates allowed. Uses Knuth's minimax algorithm to always
// suggest the guess that minimizes the worst-case number of
// remaining candidates.
// ============================================================

const ITEMS = ['Medal', 'Scroll', 'Wine', 'Food'];
const NUM_POSITIONS = 4;

// ---- Generate every possible 4-item combination (256 total) ----
function generateAllCodes() {
  const codes = [];
  for (let a = 0; a < ITEMS.length; a++) {
    for (let b = 0; b < ITEMS.length; b++) {
      for (let c = 0; c < ITEMS.length; c++) {
        for (let d = 0; d < ITEMS.length; d++) {
          codes.push([a, b, c, d]);
        }
      }
    }
  }
  return codes;
}

const ALL_CODES = generateAllCodes();

// Default opening guess: Medal, Medal, Scroll, Wine.
// (ITEMS indices: 0=Medal, 1=Scroll, 2=Wine, 3=Food)
const DEFAULT_STARTER = [0, 0, 1, 2];

// ---- Feedback calculation (standard Mastermind scoring) ----
// correct   = right item in the right position
// incorrect = right item, present elsewhere, but wrong position
function getFeedback(guess, code) {
  let correct = 0;
  const guessCount = [0, 0, 0, 0];
  const codeCount = [0, 0, 0, 0];

  for (let i = 0; i < NUM_POSITIONS; i++) {
    if (guess[i] === code[i]) {
      correct++;
    } else {
      guessCount[guess[i]]++;
      codeCount[code[i]]++;
    }
  }

  let incorrect = 0;
  for (let itemIdx = 0; itemIdx < ITEMS.length; itemIdx++) {
    incorrect += Math.min(guessCount[itemIdx], codeCount[itemIdx]);
  }

  return { correct, incorrect };
}

function codesEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

// ---- Knuth minimax: pick the guess that minimizes the worst-case ----
// number of remaining candidates, tie-breaking toward a guess that
// is still itself a possible solution.
function pickNextGuess(candidates) {
  if (candidates.length === 1) {
    return candidates[0];
  }

  let bestGuess = null;
  let bestWorstCase = Infinity;
  let bestIsCandidate = false;

  for (const guess of ALL_CODES) {
    const buckets = new Map();

    for (const candidate of candidates) {
      const fb = getFeedback(guess, candidate);
      const key = fb.correct * 10 + fb.incorrect;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    let worstCase = 0;
    for (const count of buckets.values()) {
      if (count > worstCase) worstCase = count;
    }

    const isCandidate = candidates.some(c => codesEqual(c, guess));

    const better =
      worstCase < bestWorstCase ||
      (worstCase === bestWorstCase && isCandidate && !bestIsCandidate);

    if (better) {
      bestWorstCase = worstCase;
      bestGuess = guess;
      bestIsCandidate = isCandidate;
    }
  }

  return bestGuess;
}

function filterCandidates(candidates, guess, correct, incorrect) {
  return candidates.filter(code => {
    const fb = getFeedback(guess, code);
    return fb.correct === correct && fb.incorrect === incorrect;
  });
}

// ============================================================
// Application state
// ============================================================

let history = [];        // [{ guess: [..], correct, incorrect }]
let candidates = [];      // codes still consistent with all history
let currentGuess = null;

function startNewPuzzle() {
  history = [];
  candidates = ALL_CODES.slice();
  currentGuess = DEFAULT_STARTER.slice();
  render();
}

// Generates a fully random combination (any of the 256 possible
// lineups), not just a reordering of the default starter's items.
function getRandomCode() {
  return [
    Math.floor(Math.random() * ITEMS.length),
    Math.floor(Math.random() * ITEMS.length),
    Math.floor(Math.random() * ITEMS.length),
    Math.floor(Math.random() * ITEMS.length)
  ];
}

// ============================================================
// Rendering
// ============================================================

const guessDisplay = document.getElementById('guess-display');
const attemptNumberEl = document.getElementById('attempt-number');
const solvedBanner = document.getElementById('solved-banner');
const shuffleButton = document.getElementById('shuffle-button');
const historyBody = document.getElementById('history-body');
const errorMessage = document.getElementById('error-message');
const feedbackForm = document.getElementById('feedback-form');
const correctInput = document.getElementById('correct-input');
const incorrectInput = document.getElementById('incorrect-input');

function renderGuessDisplay() {
  guessDisplay.innerHTML = '';
  currentGuess.forEach((itemIdx) => {
    const itemName = ITEMS[itemIdx];
    const imgFile = itemName.toLowerCase() + '.png';
    const div = document.createElement('div');
    div.className = 'peg';
    div.innerHTML = `
      <img class="peg-image" src="${imgFile}" alt="${itemName}">
      <div class="peg-item">${itemName}</div>
    `;
    guessDisplay.appendChild(div);
  });

  attemptNumberEl.textContent = `#${history.length + 1}`;
  solvedBanner.classList.toggle('hidden', candidates.length !== 1);
  shuffleButton.classList.toggle('hidden', history.length !== 0);
}

function formatGuess(guess) {
  return guess.map(i => ITEMS[i]).join(' / ');
}

function renderHistory() {
  historyBody.innerHTML = '';
  history.forEach((entry, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${formatGuess(entry.guess)}</td>
      <td>${entry.correct}</td>
      <td>${entry.incorrect}</td>
      <td><button type="button" class="edit-btn" data-idx="${idx}">Edit</button></td>
    `;
    historyBody.appendChild(row);
  });
}

function render() {
  renderGuessDisplay();
  renderHistory();
  clearError();
  correctInput.value = '0';
  incorrectInput.value = '0';
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}

// ============================================================
// Rebuilding state from history (used after edits)
// ============================================================

function rebuildFromHistory() {
  candidates = ALL_CODES.slice();
  for (const entry of history) {
    candidates = filterCandidates(candidates, entry.guess, entry.correct, entry.incorrect);
  }

  if (candidates.length === 0) {
    showError('This history no longer matches any possible combination. Please edit an earlier entry.');
    currentGuess = history.length > 0 ? history[history.length - 1].guess : ALL_CODES[0];
    renderHistory();
    return;
  }

  currentGuess = pickNextGuess(candidates);
  render();
}

// ============================================================
// Event handlers
// ============================================================

feedbackForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();

  const correct = parseInt(correctInput.value, 10);
  const incorrect = parseInt(incorrectInput.value, 10);

  if (
    isNaN(correct) || isNaN(incorrect) ||
    correct < 0 || correct > 4 ||
    incorrect < 0 || incorrect > 4
  ) {
    showError('Please enter numbers between 0 and 4 for both fields.');
    return;
  }

  if (correct + incorrect > 4) {
    showError('Correct + Incorrect cannot exceed 4 — there are only 4 statue positions.');
    return;
  }

  const nextCandidates = filterCandidates(candidates, currentGuess, correct, incorrect);

  if (nextCandidates.length === 0) {
    showError("No combination for this result. Are you SURE you didn't make a mistake? Re-check the numbers or edit an earlier entry, otherwise this is a restart.");
    return;
  }

  history.push({ guess: currentGuess, correct, incorrect });
  candidates = nextCandidates;
  currentGuess = pickNextGuess(candidates);
  render();
});

historyBody.addEventListener('click', (e) => {
  if (!e.target.classList.contains('edit-btn')) return;

  const idx = parseInt(e.target.dataset.idx, 10);
  const entry = history[idx];

  const row = e.target.closest('tr');
  row.innerHTML = `
    <td>${idx + 1}</td>
    <td>${formatGuess(entry.guess)}</td>
    <td><input type="number" min="0" max="4" value="${entry.correct}" class="edit-correct"></td>
    <td><input type="number" min="0" max="4" value="${entry.incorrect}" class="edit-incorrect"></td>
    <td>
      <button type="button" class="save-edit-btn">Save</button>
      <button type="button" class="cancel-edit-btn">Cancel</button>
    </td>
  `;

  row.querySelector('.save-edit-btn').addEventListener('click', () => {
    const newCorrect = parseInt(row.querySelector('.edit-correct').value, 10);
    const newIncorrect = parseInt(row.querySelector('.edit-incorrect').value, 10);

    if (
      isNaN(newCorrect) || isNaN(newIncorrect) ||
      newCorrect < 0 || newCorrect > 4 ||
      newIncorrect < 0 || newIncorrect > 4 ||
      newCorrect + newIncorrect > 4
    ) {
      showError('Please enter valid numbers (0-4 each, summing to at most 4).');
      return;
    }

    // Editing this entry invalidates every attempt after it, since
    // those suggestions were based on the old (wrong) feedback.
    history = history.slice(0, idx + 1);
    history[idx] = { guess: entry.guess, correct: newCorrect, incorrect: newIncorrect };

    rebuildFromHistory();
  });

  row.querySelector('.cancel-edit-btn').addEventListener('click', () => {
    renderHistory();
  });
});

document.getElementById('reset-button').addEventListener('click', () => {
  startNewPuzzle();
});

shuffleButton.addEventListener('click', () => {
  // Only meaningful before the first attempt has been submitted —
  // generates a brand new random lineup (any of the 256 possible
  // combinations), not just a reordering of the default starter.
  if (history.length !== 0) return;
  currentGuess = getRandomCode();
  renderGuessDisplay();
});

document.querySelectorAll('.stepper-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    let value = parseInt(target.value, 10);
    if (isNaN(value)) value = 0;

    if (btn.classList.contains('up')) {
      value = Math.min(4, value + 1);
    } else {
      value = Math.max(0, value - 1);
    }

    target.value = value;
  });
});

// ============================================================
// Init
// ============================================================

startNewPuzzle();
