# 🏗️ Architecture Technique - BudgetLanding

> **🤖 Note pour l'Assistant IA (Contexte de Démarrage)**
> Si vous découvrez ce projet, lisez impérativement ces fichiers en priorité pour charger le contexte :
> 1.  `ARCHITECTURE.md` (Ce fichier) : Comprendre la structure hybride (`src/` vs root) et les règles Firestore V2.
> 2.  `types.ts` : La source de vérité pour le modèle de données (Scenario, Resource, CalendarTemplate).
> 3.  `hooks/useAppLogic.ts` : Le point d'entrée de la logique métier.
> 4.  `src/services/*` : Pour voir comment interagir avec la base de données.
>
> **Attention :** Le projet est en cours de migration vers le dossier `src/`. Utilisez toujours les alias `@/src/services/...` pour les imports de services.

---

## ⚡ Stack Technique

| Domaine | Technologie | Justification |
| :--- | :--- | :--- |
| **Framework** | **React 18** (TypeScript) | Standard de l'industrie, typage fort pour la robustesse. |
| **Build Tool** | **Vite** | Compilation ultra-rapide et Hot Module Replacement (HMR). |
| **Styling** | **Tailwind CSS** | Approche Utility-first (actuellement via CDN, migration PostCSS prévue). |
| **Backend** | **Firebase** (SaaS) | Authentification (Google) + Base de données NoSQL Temps réel. |
| **Tests** | **Vitest** + Happy-DOM | Suite de tests légère compatible Jest. |
| **Icônes** | `lucide-react` | Icônes SVG légères et modernes. |
| **UI Utils** | `sonner` (Toasts), `date-fns` (Dates), `clsx` (Classes). |

---

## 📂 Structure du Projet & Organisation

Le projet suit une structure hybride en cours de migration vers `src/`.

### Arborescence Clé
```
/
├── src/
│   ├── services/           # TOUTE la logique backend (Firebase)
│   │   ├── firebase.ts     # Init & Exports (db, auth)
│   │   ├── scenarioService.ts
│   │   ├── resourceService.ts
│   │   └── calendarService.ts
│   └── components/
│       └── settings/       # Module de gestion des Templates de Calendrier
├── hooks/                  # Custom Hooks (Logique métier frontend)
│   ├── useAppLogic.ts      # Orchestrateur principal
│   └── useResourceStats.ts # Calculs optimisés
├── components/ui/          # Composants génériques (ex: ConfirmModal)
├── App.tsx                 # Point d'entrée & Routing (State-based)
├── types.ts                # Définitions TypeScript partagées (Domain Model)
└── constants.ts            # Constantes globales
```

### Conventions d'Import
*   L'alias `@/` pointe vers la racine du projet (`./`).
*   **Services :** Toujours importer depuis `@/src/services/NomService`.
    *   Exemple : `import { calendarService } from '@/src/services/calendarService';`
*   **Composants Racine :** Import relatif ou alias.

---

## 🏛️ Architecture des Données (Firestore)

L'application utilise une base de données NoSQL orientée documents (Firestore).
Le modèle a évolué vers une structure hiérarchique scalable (V2).

### 1. Scénarios & Ressources (V2 - Subcollections)
Conçu pour supporter un grand nombre de ressources sans charger tout le document parent.

*   📁 Collection `scenarios` (Document par Scénario)
    *   `id`, `name`, `status` (DRAFT/MASTER), `ownerId`.
    *   `envelopes`: Array (Budget global).
    *   📂 Sous-collection `resources` (Document par Ressource)
        *   `id`, `firstName`, `lastName`, `tjm`, `country`...
        *   `overrides`: `Map<DateString, Value>` (Exceptions au calendrier standard).
        *   `dynamicHolidays`: `Array<DateString>` (Jours fériés importés).

### 2. Templates de Calendrier (Nouveau Module)
Permet d'initialiser rapidement les ressources avec des congés et jours fériés pré-configurés.

*   📁 Collection `calendar_templates`
    *   `name`, `country`
    *   `isDefault`: boolean (Un seul par pays).
    *   `overrides`: Pré-remplissage des congés.
    *   `dynamicHolidays`: Pré-remplissage des jours fériés.

---

## 🧩 Architecture Applicative (Frontend)

### 1. Gestion d'État (Hooks & Services)
L'application n'utilise pas Redux.
*   `hooks/useAppLogic.ts` : Le "cerveau" de l'application. Il synchronise l'état local avec Firestore via les services.
*   `src/services/` : Couche d'abstraction qui isole la logique Firebase.
    *   **calendarService :** CRUD des templates.
    *   **resourceService :** Gestion des sous-collections & copies massives.
    *   **scenarioService :** Gestion des scénarios & publication.

### 2. Performance & Optimisations
*   **Memoization** : Utilisée intensivement dans `ResourceList` et `ResourceRow`.
*   **Calculs Déportés** : Les calculs de coûts annuels sont mis en cache via `useResourceStats`.
*   **Virtualisation** : Prêt pour `react-window` si besoin.

---

## ⚠️ Règles Métier & Points d'Attention

1.  **Mode Draft vs Master :**
    *   Seuls les scénarios `DRAFT` sont modifiables.
    *   Le passage en `MASTER` (Publication) crée une copie "gelée" et génère un nouveau `DRAFT` vierge.

2.  **Gestion des Jours Fériés & Congés :**
    *   **Standard :** Par défaut, WE = Repos, Semaine = Travail (1.0).
    *   **Overrides :** Surcharges manuelles stockées dans `overrides` (0 = Congé/Férié, 0.5 = Demi-journée).
    *   **Affichage :** Un jour est affiché "Férié" (Violet) s'il est présent dans `dynamicHolidays`. Sinon il est affiché "Congé" (Rouge) si l'override est 0.
    *   **Templates :** Lors de la création d'une ressource, on copie les `overrides` et `dynamicHolidays` du template actif vers la ressource.

3.  **Routing :**
    *   Géré dans `App.tsx` via un state simple `currentView` ('dashboard', 'budget', 'resources', 'calendars', 'simulation', 'settings').

---

## 🛠️ Commandes Utiles

*   `npm run dev` : Lancer le serveur de développement.
*   `npm run build` : Compiler pour la production.
*   `npm test` : Lancer les tests unitaires (Vitest).
