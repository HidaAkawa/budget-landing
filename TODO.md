# Liste des Tâches - BudgetLanding

## 🛠️ Phase 1 : Qualimétrie & Dette Technique (Code Health)
*Objectif : Rendre le code maintenable, testable et plus propre.*

- [ ] **Découpage Composants :** Scinder les grosses vues (`BudgetView`, `ResourcesView`) en sous-composants (ex: `ResourceList`, `ResourceForm`, `BudgetKPIs`).
- [ ] **UX Feedback :** Remplacer les `window.alert()` et `window.confirm()` par un système de Notifications (Toasts) et de Modales modernes.
- [ ] **Tests Unitaires :** Mettre en place Vitest et écrire des tests pour `utils.ts` (calculs des jours/coûts) et les nouveaux Services.
- [ ] **Code Quality :** Remplacer `Math.random()` par une librairie `uuid` pour la génération d'IDs fiables.
- [ ] **Error Handling :** Ajouter des "Error Boundaries" React pour éviter le crash complet de l'app en cas d'erreur locale.

---

## 🚀 Phase 2 : Refactoring Performance & Scalabilité (Prioritaire)
*Objectif : Supporter +250 ressources et +50 versions sans ralentissement ni crash (Migration vers Sous-collections).*

1.  [ ] **Migration du Modèle (Script) :** Créer un script temporaire pour extraire le tableau `resources` des scénarios existants et créer les documents correspondants dans une sous-collection Firestore `scenarios/{id}/resources`.
2.  [ ] **Service Layer (Découplage) :** Extraire la logique Firebase de `useAppLogic.ts` vers des services dédiés (`services/scenarioService.ts`, `services/resourceService.ts`) pour alléger le hook.
3.  [ ] **Adaptation Lecture (Backend) :** Modifier le chargement pour ne récupérer que les en-têtes de scénarios, et charger la collection `resources` à la demande (lazy loading).
4.  [ ] **Adaptation Écriture (Backend) :** Mettre à jour les fonctions CRUD (`add`, `update`, `delete`) pour interagir avec les documents de la sous-collection.
5.  [ ] **Adaptation UI (Virtualisation) :** Implémenter `react-window` dans `ResourcesView` pour gérer l'affichage performant de listes longues.
6.  [ ] **Optimisation Calculs :** Sortir les calculs lourds (stats annuelles) du cycle de rendu principal (Memoization avancée).

---

## ✨ Améliorations Fonctionnelles Futures
- [ ] **Import de Masse :** Fonctionnalité d'import Excel/CSV pour charger une liste de ressources (Nom, Prénom, TJM, Dates).
- [ ] **Export de Données :** Export propre des tableaux vers Excel/CSV.
- [ ] **Styling Build :** Intégration complète de Tailwind via PostCSS (suppression CDN).
