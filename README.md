# 💰 BudgetLanding

Application de pilotage budgétaire et de gestion de ressources IT.
Permet de gérer des scénarios budgétaires (Draft/Master), de suivre les consommés et de simuler des projections.

## 📚 Documentation Technique

Pour une vision détaillée de l'architecture (Firestore V2, Hooks, Services), consultez le document d'architecture dédié :
👉 **[ARCHITECTURE.md](./ARCHITECTURE.md)**

## 🚀 Fonctionnalités Clés

*   **Dashboard :** Vue synthétique des KPIs (CAPEX/OPEX, Consommé vs Budget).
*   **Budget :** Gestion des enveloppes budgétaires.
*   **Ressources :** Gestion des collaborateurs (TJM, Dates, Congés, Allocations).
*   **Simulation :** Système de versionning complet (Drafts, Snapshots, Publication Master).
*   **Settings :** Diagnostics techniques et outils de maintenance.

## 🛠️ Installation & Démarrage

### Pré-requis
*   Node.js (v18+)
*   Un projet Firebase configuré (Firestore + Auth Google)

### Configuration
Assurez-vous d'avoir les variables d'environnement configurées pour Firebase dans votre fichier `.env` ou `.env.local`.

### Commandes

```bash
# Installation des dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Lancer les tests unitaires
npm test

# Construire pour la production
npm run build
```

## 🏗️ État d'avancement

*   **Phase 1 (Qualimétrie) :** ✅ Terminée
*   **Phase 2 (Scalabilité & Performance) :** ✅ Terminée
    *   Migration vers sous-collections Firestore (V2).
    *   Optimisation des calculs (WeakMap Cache).
    *   Virtualisation des listes (Suppression de react-window pour une solution native optimisée).
*   **Phase 3 (Fonctionnalités) :** 🚧 À venir
