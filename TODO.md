# TODO List for Production Readiness

### 🚀 Must-Haves (Your List)
- [ ] **Corriger l'erreur d'affichage des jours féfiés dans le calendrier (violet + libellé "F")
- [ ] **Implémenter la persistance des données en base de donnée (snapshot etc). S'assurer que seul une version proprement nommée puisse être publiée en tant que master.
- [ ] **Authentication:** Move the `AUTHORIZED_USERS` list from `constants.ts` to a more robust solution (e.g., Firestore collection, Firebase IAM roles).
- [ ] **Code Simplification:** Remove all logic related to holidays (`HOLIDAYS`) in `constants.ts`, `utils.ts`, and components to simplify the code.
- [ ] **Data Persistence:** Verify that saving scenarios to the database (Firestore) works reliably between sessions.
- [ ] **Versioning:** Verify that creating and restoring "snapshots" works as expected.
- [ ] **Default View:** Ensure that the application defaults to opening the user's main version or primary scenario.

### ✨ Recommended Actions (Gemini's Suggestions)
- [ ] **Configuration Management:** Set up environment variable management for production (e.g., via Google Cloud Secrets or hosting service environment configuration) instead of the `.env.local` file.
- [ ] **UI/Styling:** Integrate Tailwind CSS into the build process (via PostCSS) instead of using the CDN to optimize performance and reliability in production.
- [ ] **Error Handling:** Add "Error Boundaries" in React to catch and handle display errors without crashing the entire application (white page).
- [ ] **Security Rules:** Define precise security rules for Firestore to ensure that each user can only access and modify their own data.
- [ ] **Deployment Pipeline:** Set up a clear deployment script or pipeline for production (e.g., `npm run build` followed by a `firebase deploy`).
- [ ] **Code Quality:** Replace the use of `Math.random()` for generating snapshot IDs with a more reliable method like UUID generation to avoid collisions.
- [ ] **Sécuriser la liste des utilisateurs autorisés :** Déplacer la liste `AUTHORIZED_USERS` de `constants.ts` vers une solution plus robuste (par exemple, une collection Firestore ou des rôles IAM Firebase) pour améliorer la sécurité.
- [ ] **Améliorer la génération d'ID uniques :** Remplacer `Math.random()` dans `BudgetView.tsx` par une méthode plus fiable comme la génération d'UUID pour éviter les collisions d'ID.
- [ ] **Factoriser les composants du formulaire :** Dans `BudgetView.tsx`, refactoriser le code des boutons "RUN" et "CHANGE" en un composant réutilisable pour réduire la duplication de code.
- [ ] **Améliorer l'interface utilisateur pour les utilisateurs non autorisés :** Dans `App.tsx`, fournir un message plus informatif ou des instructions à l'utilisateur lorsqu'il n'est pas autorisé à accéder à l'application.
