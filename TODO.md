# Liste des Tâches - BudgetLanding

## 🛠️ Phase 1 : Qualimétrie & Dette Technique (Code Health)
*Objectif : Rendre le code maintenable, testable et plus propre.*

- [X] **Découpage Composants :** Scinder les grosses vues (`BudgetView`, `ResourcesView`) en sous-composants (ex: `ResourceList`, `ResourceForm`, `BudgetKPIs`).
- [X] **UX Feedback :** Remplacer les `window.alert()` et `window.confirm()` par un système de Notifications (Toasts) et de Modales modernes.
- [X] **Tests Unitaires :** Mise en place Vitest + Happy-DOM. Tests écrits pour `utils.ts` (calculs des jours/coûts). *A compléter pour les Services une fois créés.*
- [ ] **Code Quality :** Remplacer `Math.random()` par une librairie `uuid` pour la génération d'IDs fiables.
- [ ] **Error Handling :** Ajouter des "Error Boundaries" React pour éviter le crash complet de l'app en cas d'erreur locale.

---

## 🚀 Phase 2 : Refactoring Performance & Scalabilité (Prioritaire)
*Objectif : Supporter +250 ressources et +50 versions sans ralentissement ni crash (Migration vers Sous-collections).*

1.  [X] **Migration du Modèle (Script) :** Créer un script temporaire (`src/migrations/migrateToSubcollections.ts`) pour extraire le tableau `resources`.
2.  [X] **Service Layer (Découplage) :** Extraire la logique Firebase vers des services dédiés. *Mise à jour (2026) : Centralisation complète et propre dans `src/services/` (suppression du dossier racine).*
3.  [X] **Adaptation Lecture (Backend) :** Modifier le chargement pour ne récupérer que les en-têtes de scénarios, et charger la collection `resources` à la demande (lazy loading).
4.  [X] **Adaptation Écriture (Backend) :** Mettre à jour les fonctions CRUD (`add`, `update`, `delete`) pour interagir avec les documents de la sous-collection.
5.  [X] **Adaptation UI (Virtualisation) :** Implémenter `react-window` dans `ResourcesView` pour gérer l'affichage performant de listes longues.
6.  [X] **Optimisation Calculs :** Sortir les calculs lourds (stats annuelles) du cycle de rendu principal (Memoization avancée).

---

## ✨ Phase 3 : Améliorations Fonctionnelles Futures
- [X] **Calendriers par défaut :** Module complet "Calendars" pour gérer des templates de congés/jours fériés par pays.
    - Création/Edition/Suppression de modèles.
    - Import automatique des jours fériés (API nager.at).
    - Application automatique du modèle par défaut lors de la création d'une ressource.
- [X] **Ajouter un nom de tribu :** Pour chaque ressource, champ optionnel `tribe`.
- [X] **Ajouter un champs interne/externe/alternant/stagiaire :** Pour chaque ressource, champ obligatoire `contractType`.
- [X] **Tri dans la liste des ressources :** Permettre de faire des tris au niveau des colonnes (Nom, TJM, Coût, Jours, etc.).
- [X] **Recherche dans les ressources :** Permettre de faire des recherches (Nom, Tribu).
- [ ] **Styling Build :** Intégration complète de Tailwind via PostCSS (suppression CDN).
- [ ] **Modification de masse des ressources :** Sélectionner un group de personnes et leur appliquer une modification identique à toutes. Exemple appliquer un même TJM pour tout un groupe de personnes sélectionné.
- [ ] **Import de Masse :** Fonctionnalité d'import Excel/CSV pour charger une liste de ressources (Nom, Prénom, TJM, Dates).
- [ ] **Export de Données :** Export propre des tableaux vers Excel/CSV.