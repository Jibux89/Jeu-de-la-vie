/**
 * ═══════════════════════════════════════════════════════
 *  CONTRÔLEUR UI — ui.js
 *  Gestion des 3 phases : Init → Simulation → Fin
 * ═══════════════════════════════════════════════════════
 */

'use strict';

// Raccourci
const G = window.GameOfLife;

// ══════════════════════════════════════════════════════
//  ÉTAT GLOBAL DE L'APPLICATION
// ══════════════════════════════════════════════════════
const state = {
    // Phase d'initialisation
    maxTurns:        G.TURNS_DEFAULT,  // nombre de tours choisi
    turnsValid:      true,             // validation du champ tours
    cellsTarget:     G.CELLS_DEFAULT,  // nombre cible de cellules vivantes à placer
    cellsTargetValid: true,            // validation du champ cellules cibles
    initGrid:        G.createEmptyGrid(), // grille de placement
    selectedCount:   0,                // cellules vivantes sélectionnées

    // Phase de simulation
    simGrid:         null,             // grille courante de la simulation
    previousGrid:    null,             // grille du tour précédent
    currentTurn:     0,                // tour actuel
    simInterval:     null,             // référence setInterval
    isPaused:        false,            // pause ?
    stopReason:      null,             // raison d'arrêt

    // Phase de fin
    endTurn:         0,
    endAlive:        0
};

// ══════════════════════════════════════════════════════
//  RÉFÉRENCES DOM
// ══════════════════════════════════════════════════════
const dom = {
    // Screens
    screenInit: document.getElementById('screen-init'),
    screenSim:  document.getElementById('screen-sim'),
    screenEnd:  document.getElementById('screen-end'),

    // Init
    turnsSlider:  document.getElementById('turns-slider'),
    turnsInput:   document.getElementById('turns-input'),
    turnsDisplay: document.getElementById('turns-display'),
    turnsError:   document.getElementById('turns-error'),
    cellsTargetSlider:   document.getElementById('cells-target-slider'),
    cellsTargetInput:    document.getElementById('cells-target-input'),
    cellsTargetDisplay:  document.getElementById('cells-target-display'),
    cellsTargetError:    document.getElementById('cells-target-error'),
    cellsTargetLabel:    document.getElementById('cells-target-label'),
    initGrid:     document.getElementById('init-grid'),
    cellsCounter: document.getElementById('cells-counter'),
    cellsCountText: document.getElementById('cells-count-text'),
    counterIcon:  document.getElementById('counter-icon'),
    btnClearGrid: document.getElementById('btn-clear-grid'),
    btnLaunch:    document.getElementById('btn-launch'),
    launchHint:   document.getElementById('launch-hint'),

    // Sim
    simGrid:       document.getElementById('sim-grid'),
    currentTurn:   document.getElementById('current-turn'),
    maxTurn:       document.getElementById('max-turn'),
    aliveCount:    document.getElementById('alive-count'),
    progressBar:   document.getElementById('progress-bar'),
    simStatusChip: document.getElementById('sim-status-chip'),
    btnPause:      document.getElementById('btn-pause'),
    pauseIcon:     document.getElementById('pause-icon'),
    pauseText:     document.getElementById('pause-text'),
    btnResetSim:   document.getElementById('btn-reset-sim'),

    // End
    endGrid:       document.getElementById('end-grid'),
    resultMessage: document.getElementById('result-message'),
    resultIcon:    document.getElementById('result-icon'),
    endTurn:       document.getElementById('end-turn'),
    endAlive:      document.getElementById('end-alive'),
    endDead:       document.getElementById('end-dead'),
    endIcon:       document.getElementById('end-icon'),
    btnRestart:    document.getElementById('btn-restart'),
    endHeader:     document.querySelector('#screen-end .app-header')
};

// ══════════════════════════════════════════════════════
//  NAVIGATION ENTRE ÉCRANS
// ══════════════════════════════════════════════════════
function showScreen(name) {
    const screens = {
        init: dom.screenInit,
        sim:  dom.screenSim,
        end:  dom.screenEnd
    };
    Object.entries(screens).forEach(([key, el]) => {
        el.classList.remove('active', 'entering');
        if (key === name) {
            el.classList.add('active', 'entering');
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════
//  CONSTRUCTION DES GRILLES (DOM)
// ══════════════════════════════════════════════════════

/**
 * Construit la grille DOM dans un conteneur.
 * @param {HTMLElement} container
 * @param {boolean[][]} grid
 * @param {boolean} interactive - permet les clics
 * @param {Function|null} onCellClick - callback(row, col)
 * @param {number[][]|null} bornCells - cellules à animer (nées ce tour)
 */
function renderGrid(container, grid, interactive = false, onCellClick = null, bornCells = null) {
    // Nettoyage si déjà construit → on met juste à jour les classes
    const existingCells = container.querySelectorAll('.cell');
    if (existingCells.length === G.GRID_SIZE * G.GRID_SIZE) {
        // Mise à jour rapide (pas de reconstruction du DOM)
        existingCells.forEach((cellEl) => {
            const row = parseInt(cellEl.dataset.row);
            const col = parseInt(cellEl.dataset.col);
            const isAlive = grid[row][col];
            const wasBorn  = bornCells && bornCells.some(([r, c]) => r === row && c === col);

            if (isAlive) {
                cellEl.classList.add('alive');
            } else {
                cellEl.classList.remove('alive');
            }

            // Animation naissance
            cellEl.classList.remove('born');
            if (wasBorn) {
                void cellEl.offsetWidth; // reflow pour relancer animation
                cellEl.classList.add('born');
            }
        });
        return;
    }

    // Construction initiale
    container.innerHTML = '';
    for (let row = 0; row < G.GRID_SIZE; row++) {
        for (let col = 0; col < G.GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-label', `Cellule ligne ${row + 1}, colonne ${col + 1}`);

            if (grid[row][col]) cell.classList.add('alive');
            if (!interactive) cell.classList.add('frozen-cell');

            if (interactive && onCellClick) {
                cell.addEventListener('click', () => onCellClick(row, col));
                cell.setAttribute('tabindex', '0');
                cell.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onCellClick(row, col);
                    }
                });
            }

            container.appendChild(cell);
        }
    }
}

// ══════════════════════════════════════════════════════
//  PHASE D'INITIALISATION
// ══════════════════════════════════════════════════════

/** Met à jour le fond du slider tours */
function updateSliderBackground(val) {
    const pct = ((val - G.TURNS_MIN) / (G.TURNS_MAX - G.TURNS_MIN)) * 100;
    dom.turnsSlider.style.background =
        `linear-gradient(to right, #22c55e 0%, #22c55e ${pct}%, #d1fae5 ${pct}%)`;
}

/** Met à jour le fond du slider cellules cibles */
function updateCellsTargetSliderBackground(val) {
    const pct = ((val - G.CELLS_MIN) / (G.CELLS_MAX - G.CELLS_MIN)) * 100;
    dom.cellsTargetSlider.style.background =
        `linear-gradient(to right, #22c55e 0%, #22c55e ${pct}%, #d1fae5 ${pct}%)`;
}

/** Synchronise slider ↔ input cellules cibles et valide */
function syncCellsTarget(value, source) {
    const result = G.validateCellsTarget(value);

    if (source !== 'slider') dom.cellsTargetSlider.value = Math.min(G.CELLS_MAX, Math.max(G.CELLS_MIN, isNaN(result.value) ? G.CELLS_DEFAULT : result.value));
    if (source !== 'input')  dom.cellsTargetInput.value  = isNaN(result.value) ? value : result.value;

    dom.cellsTargetDisplay.textContent = result.valid ? result.value : '?';
    dom.cellsTargetError.textContent   = result.message;
    dom.cellsTargetInput.classList.toggle('error', !result.valid);

    state.cellsTargetValid = result.valid;
    if (result.valid) {
        state.cellsTarget = result.value;
        // Mettre à jour le label de l'étape 3
        const n = result.value;
        dom.cellsTargetLabel.textContent = `${n} cellule${n > 1 ? 's' : ''}`;
        // Réinitialiser la grille si le target change (évite d'avoir plus de cellules que la cible)
        if (state.selectedCount > state.cellsTarget) {
            clearInitGrid();
        } else {
            updateCellsCounter();
            updateLaunchButton();
        }
    } else {
        updateLaunchButton();
    }

    updateCellsTargetSliderBackground(result.valid ? result.value : G.CELLS_MIN);
}

/** Synchronise slider ↔ input et valide */
function syncTurns(value, source) {
    const result = G.validateTurns(value);

    if (source !== 'slider') dom.turnsSlider.value = Math.min(G.TURNS_MAX, Math.max(G.TURNS_MIN, isNaN(result.value) ? G.TURNS_DEFAULT : result.value));
    if (source !== 'input')  dom.turnsInput.value  = isNaN(result.value) ? value : result.value;

    dom.turnsDisplay.textContent = result.valid ? result.value : '?';
    dom.turnsError.textContent   = result.message;
    dom.turnsInput.classList.toggle('error', !result.valid);

    state.turnsValid = result.valid;
    if (result.valid) state.maxTurns = result.value;

    updateSliderBackground(result.valid ? result.value : G.TURNS_MIN);
    updateLaunchButton();
}

/** Met à jour le compteur de cellules et l'apparence */
function updateCellsCounter() {
    const n      = state.selectedCount;
    const target = state.cellsTarget;
    const label  = `cellule${n > 1 ? 's' : ''}`;
    dom.cellsCountText.textContent = `${n} / ${target} ${label} placée${n > 1 ? 's' : ''}`;
    dom.cellsCounter.classList.remove('complete', 'over');

    if (n === target) {
        dom.counterIcon.textContent = '🟢';
        dom.cellsCounter.classList.add('complete');
    } else if (n > target) {
        dom.counterIcon.textContent = '🔴';
        dom.cellsCounter.classList.add('over');
    } else {
        dom.counterIcon.textContent = '⚪';
    }
}

/** Active/désactive le bouton Lancer */
function updateLaunchButton() {
    const canLaunch = state.turnsValid && state.cellsTargetValid && state.selectedCount === state.cellsTarget;
    dom.btnLaunch.disabled = !canLaunch;
    dom.btnLaunch.setAttribute('aria-disabled', String(!canLaunch));

    if (canLaunch) {
        dom.launchHint.textContent = '✅ Tout est prêt. Lancez la simulation !';
        dom.launchHint.style.color = '#16a34a';
    } else {
        const issues = [];
        if (!state.cellsTargetValid) issues.push('un nombre de cellules valide (3–99)');
        if (!state.turnsValid) issues.push('un nombre de tours valide (10–100)');
        if (state.cellsTargetValid && state.selectedCount !== state.cellsTarget) {
            const diff = state.cellsTarget - state.selectedCount;
            issues.push(diff > 0
                ? `encore ${diff} cellule${diff > 1 ? 's' : ''} à placer`
                : `retirer ${Math.abs(diff)} cellule${Math.abs(diff) > 1 ? 's' : ''}`
            );
        }
        dom.launchHint.textContent = issues.length ? `Il manque : ${issues.join(' et ')}.` : '';
        dom.launchHint.style.color = '';
    }
}

/** Toggle une cellule de la grille d'init */
function onInitCellClick(row, col) {
    const current = state.initGrid[row][col];
    // Bloquer l'ajout si le quota est atteint
    if (!current && state.selectedCount >= state.cellsTarget) return;

    state.initGrid[row][col] = !current;
    state.selectedCount += current ? -1 : 1;

    // Mise à jour de la cellule DOM
    const idx = row * G.GRID_SIZE + col;
    const cellEl = dom.initGrid.querySelectorAll('.cell')[idx];
    if (cellEl) {
        cellEl.classList.toggle('alive', state.initGrid[row][col]);
        if (!current) {
            cellEl.classList.remove('born');
            void cellEl.offsetWidth;
            cellEl.classList.add('born');
        }
    }

    updateCellsCounter();
    updateLaunchButton();
}

/** Réinitialise la grille d'initialisation */
function clearInitGrid() {
    state.initGrid = G.createEmptyGrid();
    state.selectedCount = 0;
    renderGrid(dom.initGrid, state.initGrid, true, onInitCellClick);
    updateCellsCounter();
    updateLaunchButton();
}

/** Initialise l'écran d'initialisation */
function initInitScreen() {
    // Valeurs par défaut
    state.maxTurns           = G.TURNS_DEFAULT;
    state.turnsValid         = true;
    state.cellsTarget        = G.CELLS_DEFAULT;
    state.cellsTargetValid   = true;
    state.initGrid           = G.createEmptyGrid();
    state.selectedCount      = 0;

    // Slider & input tours
    dom.turnsSlider.value = G.TURNS_DEFAULT;
    dom.turnsInput.value  = G.TURNS_DEFAULT;
    dom.turnsDisplay.textContent = G.TURNS_DEFAULT;
    dom.turnsError.textContent   = '';
    dom.turnsInput.classList.remove('error');
    updateSliderBackground(G.TURNS_DEFAULT);

    // Slider & input cellules cibles
    dom.cellsTargetSlider.value = G.CELLS_DEFAULT;
    dom.cellsTargetInput.value  = G.CELLS_DEFAULT;
    dom.cellsTargetDisplay.textContent = G.CELLS_DEFAULT;
    dom.cellsTargetError.textContent   = '';
    dom.cellsTargetInput.classList.remove('error');
    updateCellsTargetSliderBackground(G.CELLS_DEFAULT);
    dom.cellsTargetLabel.textContent = `${G.CELLS_DEFAULT} cellule${G.CELLS_DEFAULT > 1 ? 's' : ''}`;

    renderGrid(dom.initGrid, state.initGrid, true, onInitCellClick);
    updateCellsCounter();
    updateLaunchButton();
}

// ══════════════════════════════════════════════════════
//  PHASE DE SIMULATION
// ══════════════════════════════════════════════════════

/** Démarre la simulation */
function startSimulation() {
    state.simGrid     = G.cloneGrid(state.initGrid);
    state.previousGrid = null;
    state.currentTurn = 0;
    state.isPaused    = false;
    state.stopReason  = null;

    // Affichage initial (tour 0 = état initial)
    dom.maxTurn.textContent = state.maxTurns;
    updateSimDisplay(null);

    renderGrid(dom.simGrid, state.simGrid, false);
    showScreen('sim');
    updateSimStatusChip('running');

    // Lancement de la boucle
    state.simInterval = setInterval(simStep, G.SIM_INTERVAL_MS);
}

/** Un pas de simulation */
function simStep() {
    const { newGrid, born } = G.nextGeneration(state.simGrid);
    const newTurn = state.currentTurn + 1;

    // Vérification des conditions d'arrêt AVANT de valider le nouveau tour
    const stopCheck = G.checkStopConditions(newGrid, state.simGrid, newTurn, state.maxTurns);

    // Sauvegarde
    state.previousGrid = G.cloneGrid(state.simGrid);
    state.simGrid      = newGrid;
    state.currentTurn  = newTurn;

    // Rendu
    renderGrid(dom.simGrid, state.simGrid, false, null, born);
    updateSimDisplay(born);

    if (stopCheck.stopped) {
        clearInterval(state.simInterval);
        state.simInterval = null;
        state.stopReason  = stopCheck.reason;

        // Court délai pour que l'utilisateur voie le dernier état
        setTimeout(() => showEndScreen(), 800);
    }
}

/** Met à jour les infos de la barre de simulation */
function updateSimDisplay() {
    const alive = G.countAlive(state.simGrid);
    dom.currentTurn.textContent = state.currentTurn;
    dom.aliveCount.textContent  = alive;

    // Barre de progression
    const pct = Math.min(100, (state.currentTurn / state.maxTurns) * 100);
    dom.progressBar.style.width = pct + '%';
}

/** Met à jour le chip de statut */
function updateSimStatusChip(status) {
    const chip = dom.simStatusChip;
    chip.classList.remove('running', 'paused');

    if (status === 'running') {
        chip.innerHTML = '<i class="fas fa-spinner fa-spin"></i> En cours…';
        chip.classList.add('running');
    } else if (status === 'paused') {
        chip.innerHTML = '<i class="fas fa-pause"></i> En pause';
        chip.classList.add('paused');
    }
}

/** Pause / Reprendre */
function togglePause() {
    state.isPaused = !state.isPaused;

    if (state.isPaused) {
        clearInterval(state.simInterval);
        state.simInterval = null;
        dom.pauseIcon.className = 'fas fa-play';
        dom.pauseText.textContent = 'Reprendre';
        updateSimStatusChip('paused');
    } else {
        state.simInterval = setInterval(simStep, G.SIM_INTERVAL_MS);
        dom.pauseIcon.className = 'fas fa-pause';
        dom.pauseText.textContent = 'Pause';
        updateSimStatusChip('running');
    }
}

/** Réinitialise tout et revient à l'init */
function resetToInit() {
    if (state.simInterval) {
        clearInterval(state.simInterval);
        state.simInterval = null;
    }
    initInitScreen();
    showScreen('init');
}

// ══════════════════════════════════════════════════════
//  PHASE DE FIN
// ══════════════════════════════════════════════════════

/** Affiche l'écran de fin */
function showEndScreen() {
    const turn  = state.currentTurn;
    const alive = G.countAlive(state.simGrid);
    const dead  = G.GRID_SIZE * G.GRID_SIZE - alive;

    const info = G.getStopMessage(state.stopReason, turn);

    // Message et icône
    dom.resultMessage.textContent = info.message;
    dom.resultIcon.className = `fas ${info.icon} result-icon ${info.iconClass}`;
    dom.endIcon.textContent   = info.emoji;

    // Stats
    dom.endTurn.textContent  = turn;
    dom.endAlive.textContent = alive;
    dom.endDead.textContent  = dead;

    // Couleur header selon raison
    dom.endHeader.className = 'app-header end-header';
    if (info.headerClass) {
        // On applique la classe via le parent screen
        dom.screenEnd.classList.remove(
            'screen-end-max', 'screen-end-extinction', 'screen-end-stable'
        );
        dom.screenEnd.classList.add(info.headerClass);
        dom.endHeader.style.background = getHeaderGradient(state.stopReason);
    }

    // Grille figée
    renderGrid(dom.endGrid, state.simGrid, false);
    dom.endGrid.classList.add('frozen');

    showScreen('end');
}

/** Gradient de header selon résultat */
function getHeaderGradient(reason) {
    switch (reason) {
        case 'extinction': return 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #ef4444 100%)';
        case 'stable':     return 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #f59e0b 100%)';
        default:           return 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #2563eb 100%)';
    }
}

// ══════════════════════════════════════════════════════
//  ÉVÉNEMENTS
// ══════════════════════════════════════════════════════

// Slider cellules cibles
dom.cellsTargetSlider.addEventListener('input', () => {
    syncCellsTarget(dom.cellsTargetSlider.value, 'slider');
});

// Input numérique cellules cibles
dom.cellsTargetInput.addEventListener('input', () => {
    syncCellsTarget(dom.cellsTargetInput.value, 'input');
});
dom.cellsTargetInput.addEventListener('change', () => {
    const n = parseInt(dom.cellsTargetInput.value, 10);
    if (!isNaN(n)) {
        const clamped = Math.min(G.CELLS_MAX, Math.max(G.CELLS_MIN, n));
        if (clamped !== n) {
            dom.cellsTargetInput.value = clamped;
            syncCellsTarget(clamped, 'input');
        }
    }
});

// Slider tours
dom.turnsSlider.addEventListener('input', () => {
    syncTurns(dom.turnsSlider.value, 'slider');
});

// Input numérique tours
dom.turnsInput.addEventListener('input', () => {
    syncTurns(dom.turnsInput.value, 'input');
});
dom.turnsInput.addEventListener('change', () => {
    // Correction sur blur si valeur hors limites mais parseable
    const n = parseInt(dom.turnsInput.value, 10);
    if (!isNaN(n)) {
        const clamped = Math.min(G.TURNS_MAX, Math.max(G.TURNS_MIN, n));
        if (clamped !== n) {
            dom.turnsInput.value = clamped;
            syncTurns(clamped, 'input');
        }
    }
});

// Effacer grille
dom.btnClearGrid.addEventListener('click', clearInitGrid);

// Lancer simulation
dom.btnLaunch.addEventListener('click', () => {
    if (!dom.btnLaunch.disabled) {
        startSimulation();
    }
});

// Pause/Reprendre
dom.btnPause.addEventListener('click', togglePause);

// Réinitialiser (depuis sim)
dom.btnResetSim.addEventListener('click', () => {
    if (confirm('Voulez-vous vraiment arrêter la simulation et recommencer ?')) {
        resetToInit();
    }
});

// Recommencer (depuis fin)
dom.btnRestart.addEventListener('click', resetToInit);

// Clavier : Espace pour pause/reprendre quand on est en simulation
document.addEventListener('keydown', (e) => {
    const simActive = dom.screenSim.classList.contains('active');
    if (simActive && e.code === 'Space' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        togglePause();
    }
});

// ══════════════════════════════════════════════════════
//  INITIALISATION AU CHARGEMENT
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initInitScreen();
    showScreen('init');
    console.log('✅ Jeu de la Vie — Application initialisée.');
    console.log(`   Grille : ${G.GRID_SIZE}×${G.GRID_SIZE} | Tours : ${G.TURNS_MIN}–${G.TURNS_MAX} | Intervalle : ${G.SIM_INTERVAL_MS}ms`);
});
