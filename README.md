# Jeu-de-la-vie
Vibe coded with Genspark
# 🧬 Jeu de la Vie — Conway

Application web mono-page (SPA) implémentant l'automate cellulaire **Jeu de la Vie de John Conway** sur une grille fixe de **10 × 10 cellules**, conforme au PRD Version 1.0 du 12 mars 2026.

---

## ✅ Fonctionnalités implémentées

### Phase 1 — Initialisation (Version 2)
- **Étape 1 — Cellules vivantes initiales** : slider + input pour choisir entre **3 et 99** cellules à placer (défaut : 3)
- **Étape 2 — Nombre de tours** (10 à 100) via slider + input synchronisés
- Validation en temps réel avec message d'erreur explicite si hors limites
- **Étape 3 — Placement des cellules** sur la grille par clic (toggle), avec quota dynamique
- Compteur visuel « X / N cellules placées » mis à jour en fonction du choix de l'étape 1
- Si le quota cible est réduit en dessous du nombre déjà placé, la grille est automatiquement réinitialisée
- Bouton « Effacer la grille » pour recommencer le placement
- Bouton « Lancer » actif uniquement quand les 3 conditions sont remplies

### Phase 2 — Simulation
- Grille 10×10 animée automatiquement toutes les **500 ms**
- **Règles de Conway** appliquées simultanément à chaque tour :
  - Naissance : cellule morte avec exactement 3 voisines vivantes
  - Survie : cellule vivante avec 2 ou 3 voisines vivantes
  - Mort : tout autre cas
- Voisinage de Moore (8 directions), **sans wrapping torique**
- Compteur de tours en temps réel « Tour X / N »
- Compteur de cellules vivantes
- Barre de progression
- **3 conditions d'arrêt** automatiques :
  - Nombre maximum de tours atteint
  - Extinction totale (0 cellule vivante)
  - Stabilisation (état identique au tour précédent)
- Contrôles : **Pause / Reprendre** + **Réinitialiser**
- Raccourci clavier : `Espace` pour pause/reprendre

### Phase 3 — Fin
- Grille figée affichant l'état final
- Message contextuel selon la cause d'arrêt
- Statistiques : dernier tour, cellules vivantes, cellules mortes
- Couleur du header adaptée (bleu = max tours, rouge = extinction, orange = stable)
- Bouton « Recommencer » pour revenir à l'initialisation

---

## 📁 Structure des fichiers

```
index.html          ← Structure SPA (3 écrans)
css/
  style.css         ← Styles complets, responsive, animations
js/
  game.js           ← Moteur pur (règles Conway, fonctions utilitaires)
  ui.js             ← Contrôleur UI (gestion des phases, événements DOM)
prd/
  PRD_jeu_de_la_vie.html  ← Document PRD original
```

---

## 🔧 Architecture technique

- **HTML / CSS / JavaScript vanilla** — aucun framework, aucune dépendance externe hormis Google Fonts et Font Awesome (CDN)
- **Moteur pur** : `nextGeneration(grid) → { newGrid, born, died }` — fonction pure facilitant les tests
- **Rendu optimisé** : mise à jour des classes CSS uniquement (sans reconstruction du DOM à chaque tour)
- **Animations** : naissance de cellule animée via `@keyframes`
- **Accessible** : rôles ARIA, navigation clavier, contrastes conformes (ratio ≥ 4.5:1)

---

## 🌐 Point d'entrée

| Chemin | Description |
|--------|-------------|
| `/index.html` | Application principale (unique page) |

---

## ❌ Hors périmètre V1 (non implémenté)

Conformément au PRD §7 :
- Taille de grille configurable
- Nombre initial de cellules vivantes configurable (fixé à 3)
- Vitesse de simulation réglable (fixée à 500 ms)
- Import/export de configuration
- Historique des tours avec navigation arrière
- Grille torique (bords connectés)
- Mode multijoueur
- Persistance `localStorage`
- Mode « pas à pas » manuel

---

## 🚀 Étapes suivantes recommandées (V2)

1. **Mode pas à pas** — bouton « Tour suivant » pour avancer manuellement
2. **Vitesse réglable** — slider pour 100 ms à 2000 ms
3. **Historique** — navigation arrière dans les tours précédents
4. **localStorage** — reprendre la simulation après fermeture
5. **Grille torique** — option pour connecter les bords
6. **Export** — sauvegarder la configuration initiale en JSON

---

*PRD Version 1.0 — 12 mars 2026*
