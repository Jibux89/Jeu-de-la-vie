/**
 * ═══════════════════════════════════════════════════════
 *  MOTEUR DU JEU DE LA VIE — game.js
 *  Implémentation des règles de Conway sur grille 10×10
 *  Fonction pure : nextGeneration(grid) → newGrid
 * ═══════════════════════════════════════════════════════
 */

'use strict';

// ── Constantes ─────────────────────────────────────────
const GRID_SIZE = 10;          // 10 × 10
const TURNS_MIN = 10;
const TURNS_MAX = 100;
const TURNS_DEFAULT = 50;
const SIM_INTERVAL_MS = 500;   // 500 ms entre chaque tour

// Nombre de cellules vivantes initiales
const CELLS_MIN = 3;
const CELLS_MAX = 99;          // GRID_SIZE² - 1 = 99
const CELLS_DEFAULT = 3;

// ── Création d'une grille vide ─────────────────────────
/**
 * Crée une grille GRID_SIZE × GRID_SIZE remplie de false (toutes cellules mortes).
 * @returns {boolean[][]}
 */
function createEmptyGrid() {
    return Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(false)
    );
}

// ── Copie profonde d'une grille ─────────────────────────
/**
 * Retourne une copie indépendante de la grille.
 * @param {boolean[][]} grid
 * @returns {boolean[][]}
 */
function cloneGrid(grid) {
    return grid.map(row => [...row]);
}

// ── Compte les voisins vivants ─────────────────────────
/**
 * Compte le nombre de voisines vivantes (Moore neighborhood, sans wrapping).
 * @param {boolean[][]} grid
 * @param {number} row
 * @param {number} col
 * @returns {number} 0–8
 */
function countLiveNeighbors(grid, row, col) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue; // soi-même
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                if (grid[r][c]) count++;
            }
        }
    }
    return count;
}

// ── Calcul de la génération suivante ──────────────────
/**
 * Applique les règles de Conway et retourne la grille N+1.
 * Règles :
 *   - Naissance  : cellule morte avec exactement 3 voisines vivantes → vivante
 *   - Survie     : cellule vivante avec 2 ou 3 voisines vivantes → vivante
 *   - Mort       : tout autre cas → morte
 *
 * @param {boolean[][]} grid  État actuel (grille N)
 * @returns {{ newGrid: boolean[][], born: number[][], died: number[][] }}
 *   newGrid : état du tour N+1
 *   born    : liste de [row, col] des cellules nouvellement nées
 *   died    : liste de [row, col] des cellules mortes ce tour
 */
function nextGeneration(grid) {
    const newGrid = createEmptyGrid();
    const born = [];
    const died = [];

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const alive = grid[row][col];
            const neighbors = countLiveNeighbors(grid, row, col);

            let nextAlive;
            if (alive) {
                // Survie : 2 ou 3 voisines
                nextAlive = (neighbors === 2 || neighbors === 3);
            } else {
                // Naissance : exactement 3 voisines
                nextAlive = (neighbors === 3);
            }

            newGrid[row][col] = nextAlive;

            if (!alive && nextAlive) born.push([row, col]);
            if (alive && !nextAlive) died.push([row, col]);
        }
    }

    return { newGrid, born, died };
}

// ── Compte les cellules vivantes ───────────────────────
/**
 * @param {boolean[][]} grid
 * @returns {number}
 */
function countAlive(grid) {
    return grid.reduce((sum, row) =>
        sum + row.filter(Boolean).length, 0
    );
}

// ── Comparaison de deux grilles ────────────────────────
/**
 * Retourne true si les deux grilles sont identiques (même état).
 * @param {boolean[][]} a
 * @param {boolean[][]} b
 * @returns {boolean}
 */
function gridsEqual(a, b) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (a[r][c] !== b[r][c]) return false;
        }
    }
    return true;
}

// ── Sérialisation (clé unique pour détecter les cycles) ─
/**
 * Convertit une grille en chaîne binaire pour comparaison rapide.
 * @param {boolean[][]} grid
 * @returns {string}
 */
function serializeGrid(grid) {
    return grid.flat().map(v => v ? '1' : '0').join('');
}

// ── Validation du nombre de cellules vivantes ────────
/**
 * Valide la valeur saisie pour le nombre de cellules vivantes initiales.
 * @param {number|string} value
 * @returns {{ valid: boolean, value: number, message: string }}
 */
function validateCellsTarget(value) {
    const n = parseInt(value, 10);
    if (isNaN(n)) {
        return { valid: false, value: NaN, message: '⚠ Veuillez entrer un nombre entier.' };
    }
    if (n < CELLS_MIN) {
        return { valid: false, value: n, message: `⚠ Le minimum est ${CELLS_MIN} cellules.` };
    }
    if (n > CELLS_MAX) {
        return { valid: false, value: n, message: `⚠ Le maximum est ${CELLS_MAX} cellules (grille 10×10).` };
    }
    return { valid: true, value: n, message: '' };
}

// ── Validation du nombre de tours ─────────────────────
/**
 * Valide la valeur saisie pour le nombre de tours.
 * @param {number|string} value
 * @returns {{ valid: boolean, value: number, message: string }}
 */
function validateTurns(value) {
    const n = parseInt(value, 10);
    if (isNaN(n)) {
        return { valid: false, value: NaN, message: '⚠ Veuillez entrer un nombre entier.' };
    }
    if (n < TURNS_MIN) {
        return { valid: false, value: n, message: `⚠ Le minimum est ${TURNS_MIN} tours.` };
    }
    if (n > TURNS_MAX) {
        return { valid: false, value: n, message: `⚠ Le maximum est ${TURNS_MAX} tours.` };
    }
    return { valid: true, value: n, message: '' };
}

// ── État de la simulation ──────────────────────────────
/**
 * Vérifie les conditions d'arrêt pour la grille courante.
 * @param {boolean[][]} currentGrid
 * @param {boolean[][]} previousGrid
 * @param {number} currentTurn
 * @param {number} maxTurns
 * @returns {{ stopped: boolean, reason: 'max'|'extinction'|'stable'|null }}
 */
function checkStopConditions(currentGrid, previousGrid, currentTurn, maxTurns) {
    // 1. Nombre max de tours atteint
    if (currentTurn >= maxTurns) {
        return { stopped: true, reason: 'max' };
    }
    // 2. Extinction totale
    if (countAlive(currentGrid) === 0) {
        return { stopped: true, reason: 'extinction' };
    }
    // 3. Stabilisation
    if (previousGrid && gridsEqual(currentGrid, previousGrid)) {
        return { stopped: true, reason: 'stable' };
    }
    return { stopped: false, reason: null };
}

/**
 * Génère le message de fin selon la raison d'arrêt.
 * @param {'max'|'extinction'|'stable'} reason
 * @param {number} turn
 * @returns {{ message: string, icon: string, iconClass: string, headerClass: string, emoji: string }}
 */
function getStopMessage(reason, turn) {
    switch (reason) {
        case 'max':
            return {
                message: `Simulation terminée — nombre de tours atteint.`,
                icon: 'fa-flag-checkered',
                iconClass: '',
                headerClass: 'screen-end-max',
                emoji: '🏁'
            };
        case 'extinction':
            return {
                message: `Extinction totale au tour ${turn}.`,
                icon: 'fa-skull',
                iconClass: 'red',
                headerClass: 'screen-end-extinction',
                emoji: '💀'
            };
        case 'stable':
            return {
                message: `État stable atteint au tour ${turn}.`,
                icon: 'fa-lock',
                iconClass: 'amber',
                headerClass: 'screen-end-stable',
                emoji: '🔒'
            };
        default:
            return {
                message: 'Simulation terminée.',
                icon: 'fa-check',
                iconClass: '',
                headerClass: '',
                emoji: '✅'
            };
    }
}

// ── Exportation globale ────────────────────────────────
window.GameOfLife = {
    GRID_SIZE,
    TURNS_MIN,
    TURNS_MAX,
    TURNS_DEFAULT,
    SIM_INTERVAL_MS,
    CELLS_MIN,
    CELLS_MAX,
    CELLS_DEFAULT,
    createEmptyGrid,
    cloneGrid,
    countLiveNeighbors,
    nextGeneration,
    countAlive,
    gridsEqual,
    serializeGrid,
    validateCellsTarget,
    validateTurns,
    checkStopConditions,
    getStopMessage
};
