# BudgetLanding

Application SPA de pilotage budgétaire IT permettant de gérer des scenarii de ressources humaines : TJM, conges, jours feries, enveloppes budgetaires, avec un systeme de versionning Draft/Master.

**Stack** : React 18 / TypeScript / Firebase (Firestore + Auth) / Tailwind CSS / Vite

---

## Fonctionnalites

| Module | Description |
|--------|-------------|
| **Dashboard** | KPIs synthetiques : CAPEX/OPEX, consomme vs budget, repartition par type de contrat |
| **Budget** | Gestion des enveloppes budgetaires (RUN / CHANGE) avec montants et suivi |
| **Ressources** | Gestion des collaborateurs : TJM, pays, dates de mission, type de contrat, ratio Change |
| **Calendrier** | Editeur visuel jour par jour avec gestion des conges, jours feries, demi-journees |
| **Templates Calendrier** | Modeles de calendrier par pays (FR, PT, IN, CO) avec jours feries pre-configures |
| **Versions & Publication** | Snapshots, brouillons multiples, publication vers MASTER avec archivage automatique |
| **Administration** | Gestion des utilisateurs autorises (whitelist), roles ADMIN/USER, diagnostics |

## Architecture

```
/
├── App.tsx                          # Point d'entree, routing par state
├── index.tsx                        # Mount React + ErrorBoundary
├── types.ts                         # Modele de donnees (source de verite)
├── constants.ts                     # Constantes globales
├── utils.ts                         # Calculs metier (jours, couts)
│
├── src/
│   ├── services/                    # Couche Firebase (abstraction complete)
│   │   ├── firebase.ts              # Init Firebase, exports auth/db
│   │   ├── scenarioService.ts       # CRUD scenarios + publish
│   │   ├── resourceService.ts       # CRUD ressources (sous-collection)
│   │   ├── calendarService.ts       # CRUD templates calendrier
│   │   └── userService.ts           # Gestion whitelist utilisateurs
│   │
│   ├── hooks/                       # Logique metier
│   │   ├── useAppLogic.ts           # Orchestrateur principal
│   │   ├── useAuth.ts               # Authentification Google + roles
│   │   └── useResourceStats.ts      # Calcul stats annuelles (cache WeakMap)
│   │
│   └── components/
│       ├── views/                   # Vues principales (lazy-loaded)
│       │   ├── DashboardView.tsx
│       │   ├── BudgetView.tsx
│       │   ├── ResourcesView.tsx
│       │   ├── ResourceCalendar.tsx
│       │   ├── SimulationView.tsx
│       │   └── SettingsView.tsx
│       ├── settings/                # Module templates calendrier
│       │   ├── CalendarTemplatesManager.tsx
│       │   └── UsersManager.tsx
│       └── ui/                      # Composants generiques
│           ├── ConfirmModal.tsx
│           └── ErrorBoundary.tsx
│
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json                    # strict: true
├── eslint.config.js
├── .prettierrc
└── firestore.rules
```

## Modele de donnees

### Firestore (V2 — sous-collections)

```
scenarios/{scenarioId}
  ├── name, status (DRAFT|MASTER|ARCHIVED), ownerId, parentId
  ├── envelopes: BudgetEnvelope[]
  └── resources/{resourceId}          # Sous-collection
        └── firstName, lastName, tjm, country, contractType,
            startDate, endDate, overrides, dynamicHolidays

calendar_templates/{templateId}
  └── name, country, isDefault, overrides, dynamicHolidays

authorized_users/{email}
  └── email, role (ADMIN|USER), addedAt, addedBy
```

### Regles metier

- **DRAFT** = modifiable, prive (visible uniquement par le proprietaire)
- **MASTER** = gele, visible par tous
- **Publication** : DRAFT devient MASTER, l'ancien MASTER est archive, un nouveau DRAFT vierge est cree
- **Overrides** : `0` = conge/ferie, `0.5` = demi-journee, `1` = journee complete
- **dynamicHolidays** : jours feries charges depuis une API externe (affichage violet)

## Installation

### Pre-requis

- Node.js 18+
- Un projet Firebase avec Firestore + Authentication Google active

### Configuration

Creer un fichier `.env.local` a la racine :

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Optionnel : emails admin bootstrap (premiere connexion)
VITE_BOOTSTRAP_ADMINS=admin@example.com
```

Les valeurs Firebase se trouvent dans la **Console Firebase** > Parametres du projet > Configuration de l'application web.

### Demarrage

```bash
# Installer les dependances
npm install

# Lancer en developpement (http://localhost:3000)
npm run dev

# Build production
npm run build

# Previsualiser le build
npm run preview
```

## Tests

Le projet utilise **Vitest** avec **Happy-DOM**. Les tests sont ecrits en francais pour rester coherents avec le domaine metier.

```bash
# Lancer tous les tests
npm test

# Mode watch
npx vitest --watch

# Rapport de couverture
npm run test:coverage
```

**Couverture actuelle** : 46 tests couvrant les services Firebase (mocks), les hooks metier et les utilitaires de calcul.

| Suite | Tests | Couverture |
|-------|-------|------------|
| scenarioService | 8 | CRUD, publish, subscriptions |
| resourceService | 9 | CRUD, overrides, copy batch |
| calendarService | 11 | CRUD, isDefault, unset country |
| useResourceStats | 11 | Calculs annuels, cache, overrides |
| utils | 7 | calculateDayStatus (weekends, feries, bounds) |

## Qualite du code

### TypeScript strict

Le projet est en mode `strict: true` avec les regles suivantes activees :
- `noUnusedLocals`, `noUnusedParameters`
- `noImplicitReturns`, `noFallthroughCasesInSwitch`
- Zero `any` (enforce par ESLint)

### Linting & Formatage

```bash
# Verifier le code
npm run lint

# Corriger automatiquement
npm run lint:fix

# Formater avec Prettier
npm run format
```

### Conventions

- **Imports** : alias `@/` vers la racine du projet
- **Services** : toujours importes depuis `@/src/services/`
- **Etat** : hooks custom (pas de Redux)
- **Classes CSS** : `clsx` pour les conditionnelles, jamais de concatenation
- **Memoisation** : `React.memo` sur les composants de liste, `useMemo` pour les calculs derives

## Performance

### Code splitting

Les vues sont chargees en lazy-loading via `React.lazy()`. Le bundle est decoupe en chunks :

| Chunk | Taille (gzip) | Contenu |
|-------|---------------|---------|
| Core app | ~19 kB | App, hooks, routing |
| Vendor | ~51 kB | React, date-fns |
| Firebase | ~110 kB | Firebase Auth + Firestore |
| Vues | 2-5 kB chacune | Chargees a la demande |

### Optimisations

- **WeakMap cache** pour les stats annuelles des ressources
- **Set** pour les lookups de jours feries en O(1)
- **Comparaison de strings ISO** pour les dates (pas de parsing Date)
- **Subscriptions Firestore** en temps reel (pas de polling)

## Deploiement

Le projet est configure pour **Firebase Hosting** :

```bash
# Build + deploy
npm run build
firebase deploy
```

Le fichier `firebase.json` configure le rewrite SPA et les regles Firestore.

## Securite

- **Authentification** : Google OAuth via Firebase Auth
- **Autorisation** : whitelist email dans Firestore (`authorized_users`)
- **Roles** : ADMIN (gestion utilisateurs) / USER (lecture/ecriture scenarios)
- **Regles Firestore** : validation cote serveur (auth + whitelist + role)
- **Bootstrap admin** : configurable via variable d'environnement (pas de hardcode)

## Licence

Projet prive.
