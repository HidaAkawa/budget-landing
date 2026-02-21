# 🤖 CLAUDE.md — BudgetLanding

> Lis ce fichier en entier avant toute action. C'est la source de vérité pour travailler sur ce projet.

---

## 📚 Contexte du Projet

**BudgetLanding** est une SPA React 18 / TypeScript permettant de gérer des scénarios budgétaires de ressources humaines (TJM, congés, jours fériés, enveloppes budgétaires). Le backend est intégralement Firebase (Firestore + Auth Google).

---

## 📂 Structure & Fichiers Clés

Lis ces fichiers en priorité pour charger le contexte métier :

1. `types.ts` — Source de vérité du modèle de données (Scenario, Resource, CalendarTemplate)
2. `src/hooks/useAppLogic.ts` — Orchestrateur principal de la logique métier
3. `src/services/` — Couche d'abstraction Firebase (scenarioService, resourceService, calendarService, userService)
4. `App.tsx` — Point d'entrée, routing via state `currentView`

### Arborescence
```
/
├── App.tsx                          # Point d'entrée, routing par state
├── index.tsx                        # Mount React + ErrorBoundary
├── types.ts                         # Modèle de données (source de vérité)
├── constants.ts                     # Constantes globales
├── utils.ts                         # Calculs métier (jours, coûts)
│
├── src/
│   ├── services/                    # Couche Firebase (abstraction complète)
│   │   ├── firebase.ts              # Init Firebase, exports auth/db
│   │   ├── scenarioService.ts       # CRUD scénarios + publish
│   │   ├── resourceService.ts       # CRUD ressources (sous-collection)
│   │   ├── calendarService.ts       # CRUD templates calendrier
│   │   └── userService.ts           # Gestion whitelist utilisateurs
│   │
│   ├── hooks/                       # Logique métier
│   │   ├── useAppLogic.ts           # Orchestrateur principal
│   │   ├── useAuth.ts               # Authentification Google + rôles
│   │   └── useResourceStats.ts      # Calcul stats annuelles (cache WeakMap)
│   │
│   └── components/
│       ├── views/                   # Vues principales (lazy-loaded)
│       │   ├── DashboardView.tsx
│       │   ├── BudgetView.tsx
│       │   ├── BudgetForm.tsx
│       │   ├── BudgetList.tsx
│       │   ├── BudgetKPIs.tsx
│       │   ├── ResourcesView.tsx
│       │   ├── ResourceForm.tsx
│       │   ├── ResourceList.tsx
│       │   ├── ResourceCalendar.tsx
│       │   ├── SimulationView.tsx
│       │   └── SettingsView.tsx
│       ├── settings/                # Module templates calendrier + admin
│       │   ├── CalendarTemplatesManager.tsx
│       │   ├── CalendarTemplateEditor.tsx
│       │   ├── CalendarTemplateForm.tsx
│       │   ├── CalendarTemplateList.tsx
│       │   └── UsersManager.tsx
│       └── ui/                      # Composants génériques
│           ├── ConfirmModal.tsx
│           └── ErrorBoundary.tsx
│
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

---

## 🏛️ Règles d'Architecture — À RESPECTER ABSOLUMENT

### Imports
- L'alias `@/` pointe vers la racine du projet (`./`)
- **Toujours** importer les services depuis `@/src/services/NomService`
- Exemple : `import { calendarService } from '@/src/services/calendarService'`

### Nouveaux fichiers
- Tout nouveau fichier va dans `src/` (composants, hooks, utils)
- Ne jamais créer de nouveaux fichiers à la racine sauf `types.ts` et `constants.ts`

### TypeScript
- **Zéro `any`** — toujours typer explicitement
- Les types partagés vont dans `types.ts`
- Utiliser les types existants avant d'en créer de nouveaux

### État & Services
- Pas de Redux — état géré via hooks custom
- La logique Firebase est **exclusivement** dans `src/services/`
- Les hooks appellent les services, jamais Firebase directement
- `useAppLogic.ts` est l'orchestrateur — ne pas dupliquer sa logique ailleurs

### Composants
- Utiliser `React.memo` pour les composants de liste (ResourceList, ResourceRow)
- Extraire les calculs coûteux dans des hooks dédiés (voir `useResourceStats`)
- `clsx` pour les classes conditionnelles, jamais de concaténation de strings

---

## 🧪 Tests (Vitest + Happy-DOM)

### Stratégie — Priorités dans l'ordre
1. **Services Firebase** (`src/services/`) — mocker Firestore avec `vi.mock`
2. **Logique métier des hooks** (`src/hooks/`) — tester les calculs purs
3. **Composants UI critiques** — tester le comportement, pas le rendu

### Conventions
- Un fichier de test par fichier source : `monFichier.test.ts` à côté de `monFichier.ts`
- Mocker Firebase systématiquement : jamais d'appels réels en test
- Nommer les tests en français pour rester cohérent avec le domaine métier
- `describe` = nom du module, `it` = comportement attendu

### Exemple de structure
```typescript
describe('scenarioService', () => {
  it('doit retourner uniquement les scénarios DRAFT de l\'utilisateur', async () => { ... })
  it('doit lever une erreur si l\'utilisateur n\'est pas authentifié', async () => { ... })
})
```

### Commandes
```bash
npm test              # Lancer tous les tests
npm run test:watch    # Mode watch
npm run test:coverage # Rapport de couverture
```

---

## ⚠️ Règles Métier Critiques

### Draft vs Master
- Seuls les scénarios `DRAFT` sont modifiables — vérifier le statut avant toute écriture
- La publication (`DRAFT` → `MASTER`) : crée une copie gelée + génère un nouveau `DRAFT` vierge
- Ne jamais modifier directement un scénario `MASTER`

### Jours Fériés & Congés
- `overrides` : `Map<DateString, Value>` — `0` = Congé/Férié, `0.5` = Demi-journée
- `dynamicHolidays` : `Array<DateString>` — affichage violet (Férié)
- Congé sans `dynamicHolidays` = affichage rouge
- Lors de la création d'une ressource, copier `overrides` + `dynamicHolidays` du template actif

### Firestore V2 — Structure Hiérarchique
```
scenarios/{scenarioId}/resources/{resourceId}
calendar_templates/{templateId}
authorized_users/{email}
```
- Les ressources sont des **sous-collections**, pas des arrays dans le document parent
- `isDefault` : un seul template par pays — enforcer cette contrainte côté service

---

## 🛠️ Commandes Utiles

```bash
npm run dev           # Serveur de développement
npm run build         # Build production
npm test              # Tests Vitest
npm run lint          # ESLint
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier
```

---

## 🚫 Ce qu'il ne faut PAS faire

- Ne pas appeler Firebase directement depuis un composant ou un hook non-service
- Ne pas créer de nouveaux fichiers à la racine (hors `types.ts`, `constants.ts`)
- Ne pas utiliser `any` en TypeScript
- Ne pas écrire de tests qui appellent Firebase réellement
- Ne pas modifier un scénario `MASTER`
- Ne pas dupliquer la logique de `useAppLogic.ts`
