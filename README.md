# MET Collection Explorer

**Une exploration full-stack de plus de 470 000 œuvres d'art du Metropolitan Museum of Art**

🔗 **[Démo en ligne Google Cloud](https://met-explorer-app-622519656872.us-central1.run.app/?culture=French)** | 📚 [Documentation de l'API MET](https://metmuseum.github.io/)

---

## Table des matières

- [L'histoire](#lhistoire)
- [Le défi](#le-défi)
- [L'architecture](#larchitecture)
- [Décisions techniques clés](#décisions-techniques-clés)
- [Démarrage](#démarrage)
- [Déploiement](#déploiement)
- [Leçons apprises](#leçons-apprises)

---

## L'histoire

Ce projet a commencé avec un objectif simple : construire une interface de recherche et de filtrage persistante pour un test technique.
C’est ensuite la découverte de la collection d’art du Met Gallery qui a captivé mon esprit.

---

## Le défi

### Travailler avec l'API MET

L'API MET est généreuse mais a des contraintes qui façonnent la manière dont vous construisez avec elle :

**Limites de taux**
- Limite de 80 requêtes par seconde.
- En en de développement, problémes avec CORS.

**Défis de structure de données**
1. **Le endpoint `/objects` retourne tous les 470 000+ IDs d'objets** — un tableau JSON massif sans pagination intégrée
2. **Chaque œuvre nécessite un appel API séparé** vers `/objects/{id}` pour obtenir les détails complets
3. **La recherche est limitée** — a cause de la limite de requêtes
4. **La disponibilité des images est incohérente**


### Les vrais problèmes que nous avons résolus

**Problème 1 : Vous ne pouvez pas paginer 470 000 IDs d'objets efficacement**

**Notre solution :** Construire un backend Node.js qui :
- Importe l'intégralité de la collection MET dans une base de données Postgres (~300Mb) (Supabase)
- Implémente une recherche plein texte côté serveur sur les titres, artistes et cultures
- Retourne des résultats paginés (20 par page) avec filtres
- Met en cache les listes de départements

**Problème 2 : L'état de filtre complexe dans le navigateur est fragile**

Les utilisateurs ajustent 6+ filtres, naviguent à travers les pages, cliquent sur une œuvre pour voir les détails, appuient sur retour — et perdent tous leurs filtres. C'est la plainte #1 dans toute interface basée sur des filtres.

**Notre solution :** Synchroniser tout l'état de filtre avec l'URL en utilisant `nuqs` :
```
/?q=gold&dept=10&culture=Greek&from=-800&to=-300&highlight=true&page=2
```
Chaque changement de filtre met à jour l'URL. Chaque URL est mémorisable, partageable, et sûre pour le bouton retour. Redux possède l'état, `nuqs` possède la sérialisation de l'URL.

**Problème 3 : La synchronisation manuelle d'URL est un champ de mines**

Avant `nuqs`, nous écrivions du parsing manuel `URLSearchParams` et des appels `history.pushState`. Cela produisait :
- Des boucles de synchronisation infinies (Redux → URL → Redux → URL...)
- Des conditions de course avec l'entrée de mot-clé débounced
- Une pollution de l'historique du navigateur (150+ entrées après 5 minutes de filtrage)
- Un état obsolète après retour/avancer du navigateur

**Notre solution :** Remplacer la synchronisation manuelle d'URL par `nuqs`, qui gère :
- Le parsing d'URL type-safe (`parseAsString`, `parseAsInteger`, `parseAsBoolean`)
- Le debouncing automatique (400ms sur l'entrée de mot-clé)
- Les mises à jour d'URL par lots (plusieurs changements de filtres → un push d'historique)
- La gestion correcte de l'historique (`push` pour les filtres, `replace` pour la pagination)

**Problème 4 : L'API MET n'a pas de cache intégré**

Chaque appel `/objects/{id}` frappe leurs serveurs. Pour une grille de 20 œuvres, ce sont 20 appels API. Multipliez par chaque utilisateur, chaque navigation de page — c'est gaspilleur et lent.

**Notre solution :** RTK Query fournit un cache automatique :
- Cache de 5 minutes pour les listes d'œuvres
- Cache de 10 minutes pour les œuvres individuelles (elles ne changent jamais)
- Cache d'1 heure pour les listes de départements (elles ne changent vraiment jamais)
- Déduplication : deux composants demandant les mêmes données ne font qu'une seule requête HTTP

---

## L'architecture

### Stack technique

**Frontend**
- **React 18** — composants UI et rendu
- **TypeScript** — mode strict activé dès le premier jour
- **Redux Toolkit** — gestion d'état
- **RTK Query** — cache serveur et appels API
- **nuqs** — synchronisation d'état URL type-safe
- **Vite** — outil de build et serveur de développement

**Backend**
- **Node.js** — module `http` vanilla (pas de framework Express)
- **Postgres (Supabase)** — base de données avec recherche plein texte
- **Docker** — conteneurisation avec build en deux étapes

**Déploiement**
- **Google Cloud Run** — plateforme de conteneurs serverless
- **Supabase** — Postgres géré avec tier gratuit

### Flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│                         URL du navigateur                        │
│         /?q=gold&dept=10&culture=Greek&page=2                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │  nuqs lit l'URL au montage
                              │  nuqs surveille popstate pour retour/avancer
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Hook useUrlSync                             │
│  - Effet 1 : URL → Redux (montage)                               │
│  - Effet 2 : Redux → URL (changements de filtre)                 │
│  - Effet 3 : URL → Redux (retour/avancer navigateur)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │  dispatch des actions
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Store Redux                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ filtersSlice                                               │ │
│  │  - keyword, departmentId, culture, dateRange, isHighlight  │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ searchSlice                                                │ │
│  │  - page, totalResults                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Cache RTK Query                                            │ │
│  │  - listes d'œuvres (TTL 5min)                              │ │
│  │  - détails d'œuvres (TTL 10min)                            │ │
│  │  - départements (TTL 1h)                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │  les composants lisent via useAppSelector
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Composants React                              │
│  - FilterPanel  → dispatch des actions Redux sur input          │
│  - Toolbar      → lit Redux, affiche les pills de filtres actifs│
│  - ArtGrid      → lit RTK Query, rend les cartes                │
│  - Pagination   → lit l'état de page, appelle usePageNavigation │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │  useUrlSync surveille les changements Redux
                              ▼
                   nuqs écrit le nouvel état dans l'URL
```

### Pourquoi cette architecture ?

**Redux comme source unique de vérité**
- Tout l'état de filtre vit dans Redux
- RTK Query utilise l'état Redux pour construire les clés de cache

**nuqs comme couche de sérialisation d'URL**
- Remplace les `URLSearchParams` manuels et `history.pushState`
- Debouncing et batching intégrés
- Nettoyage automatique des valeurs par défaut de l'URL

**La règle critique :** Redux possède l'état. nuqs possède l'URL. 

---

## Décisions techniques clés

### 1. Pourquoi construire un backend au lieu d'utiliser l'API MET directement ?

**Considéré :** Filtrage côté client de la réponse complète `/objects`

**Problème :** Le endpoint objects retourne tous les IDs d'objets dans un tableau massif — télécharger 7 Mo+ de JSON à chaque chargement de page pour la pagination côté client est inutilisable.

**Décision :** Importer la collection MET dans Postgres (Supabase) avec :
- Recherche plein texte sur `title`, `artistDisplayName`, et `culture`
- Requêtes indexées sur `departmentId`, `objectDate`, et `isHighlight`
- Pagination côté serveur (20 résultats par page)
- Filtrage efficace sur 470 000+ enregistrements

**Compromis :** Plus de complexité d'infrastructure, mais UX et performance nettement meilleures.

---

### 2. Pourquoi nuqs plutôt que la synchronisation manuelle d'URL ?

**L'approche manuelle avec laquelle nous avons commencé :**
```typescript
// ❌ Sync manuelle — 150 lignes, 3 hooks useEffect, 3 guards useRef
const [filterParams, setFilterParams] = useState(parseUrl());
useEffect(() => { 
  window.history.pushState(null, '', serializeFilters(filters)); 
}, [filters]);
useEffect(() => { /* debounce keyword */ }, [filters.keyword]);
useEffect(() => { /* popstate listener */ }, []);
```

**Problèmes :**
- Boucles de synchronisation (Redux → URL → Redux infiniment)
- Conditions de course avec le debouncing
- Refs obsolètes causant des écritures incorrectes
- Pollution de la pile d'historique (centaines d'entrées)

**L'approche nuqs :**
```typescript
// ✅ nuqs — 60 lignes, parsers déclaratifs, garde-fous intégrés
const [filterParams, setFilterParams] = useQueryStates({
  q: parseAsString.withDefault('').withOptions({ debounceMs: 400 }),
  dept: parseAsString.withDefault(''),
  // ...
}, { history: 'push', scroll: false });
```

**Bénéfices :**
- Parsing d'URL type-safe et Debouncing automatique
- Mises à jour par lots (un push d'historique pour plusieurs filtres)
- Gestion correcte de l'historique (push vs replace par param)
- Zéro bug de boucle de sync

---

### 3. Pourquoi RTK Query plutôt que useEffect + fetch ?

**Le pattern que nous avons remplacé :**
```typescript
// ❌ useEffect + fetch — dupliqué dans chaque composant
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch('/api/artworks')
    .then(res => res.json())
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);
```

**Problèmes :**
- Conditions de course (démontage avant fin du fetch)
- Pas de cache (re-fetch à chaque rendu)
- Pas de déduplication (deux composants = deux appels HTTP)
- État loading/error manuel dans chaque composant

**Approche RTK Query :**
```typescript
// ✅ RTK Query — une déclaration, tout automatique
export const metApi = createApi({
  endpoints: (builder) => ({
    getArtworks: builder.query<ArtworksResponse, FilterParams>({
      query: (params) => ({ url: '/artworks', params }),
      keepUnusedDataFor: 300, // cache 5 minutes
    }),
  }),
});

// Dans le composant :
const { data, isLoading, isError } = useGetArtworksQuery(filters);
```

**Bénéfices :**
- Cache automatique avec TTL configurable
- Déduplication des requêtes (mêmes params = un appel HTTP)
- États loading/error sans useState

---

### 4. Pourquoi Supabase plutôt que Cloud SQL ?

**Coûts Cloud SQL :**
- ~25€/mois pour la plus petite instance
- Toujours en cours d'exécution, même à trafic zéro
- Nécessite une configuration VPC

**Tier gratuit Supabase :**
- 500 Mo de stockage base de données gratuit
- Requêtes API illimitées
- Postgres avec recherche plein texte
- Dashboard pour requêtes manuelles

**Compromis :** Pour un projet portfolio, Supabase est parfait. Pour la production à grande échelle, Cloud SQL avec pooling de connexions serait le bon choix.

---

## Démarrage

### Prérequis

- Node.js 20+
- npm ou yarn
- Docker (pour le déploiement)
- Compte Supabase (tier gratuit)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/kaishlioui/Met-Gallery-Zest.git
cd Met-Gallery-Zest

# Installer les dépendances
npm install

```

### Variables d'environnement

```bash
# Crér votre .env et ajouter votre password avec vos identifiants Supabase
DATABASE_URL=postgresql://user:password@host:port/database
```

### Exécution locale

```bash
# Démarrer le backend Node.js et le serveur vite ensemble

npm run dev

# L'app tourne sur http://localhost:5173
# L'API tourne sur http://localhost:3001
```

## Déploiement

### Build Docker

Le `Dockerfile` utilise un build en deux étapes :

**Étape 1 — Build**
- Image Node.js complète avec devDependencies
- Compile TypeScript, bundle React avec Vite
- Sortie : dossier `dist/` avec assets compilés

**Étape 2 — Production**
- Image slim `node:20-alpine`
- Seulement les dépendances de production
- Pas de TypeScript, pas de fichiers source
- S'exécute comme utilisateur non-root pour la sécurité
- Image finale : ~200 Mo

### Déployer sur Google Cloud Run

```bash
# S'authentifier avec Google Cloud
gcloud auth login
gcloud config set project VOTRE_PROJECT_ID

# Déployer (build et déploiement en une commande)
gcloud run deploy met-collection-explorer \
  --source . \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=postgresql://..." \
  --port=8080 \
  --region=us-central1
```

**Ce que cela fait :**
1. Cloud Run lit votre `Dockerfile`
2. Build l'image dans Cloud Build
3. Pousse vers Container Registry
4. Déploie vers un conteneur serverless
5. Vous donne une URL HTTPS publique : `https://met-explorer-xxxxx-uc.a.run.app`

**Mise à l'échelle :**
- Scale à zéro quand inactif (pas de coût)
- Scale jusqu'à 100+ instances sous charge
- Payez seulement pour les requêtes réelles
- Tier gratuit : 2 millions de requêtes/mois


---

## Leçons apprises

### 1. **Tokens de design avant les composants**

Les variables CSS pour l'espacement, la typographie et les couleurs empêchent les valeurs ad-hoc dispersées dans 50 fichiers. Un changement à `--space-4` met à jour chaque composant. Pas de tokens de design = enfer de rechercher-remplacer.

### 2. **Types avant Redux avant composants**

L'ordre de build correct :
1. Définir les types TypeScript (`FilterParams`, `ArtObject`, `ArtObjectSummary`)
2. Construire les slices Redux qui utilisent ces types
3. Construire les composants qui lisent depuis Redux

Inverser cet ordre signifie reconstruire les composants quand vous réalisez que votre structure d'état était mauvaise.

### 3. **Redux possède l'état. nuqs possède l'URL.**

L'erreur `nuqs` la plus courante : en faire la source de vérité. Les composants doivent dispatcher des actions Redux, pas appeler `setParams()` directement. Le flux de données est :

```
FilterPanel → dispatch(setKeyword) → changement d'état Redux 
→ useUrlSync voit le changement → nuqs écrit dans l'URL
```

Pas :
```
FilterPanel → setParams({q}) → nuqs met à jour → ???
```

### 4. **La synchronisation manuelle d'URL ne vaut pas les bugs**

Nous avons passé une semaine à déboguer les boucles de sync, conditions de course, et refs obsolètes dans le code manuel `URLSearchParams` + `history.pushState`. `nuqs` a tout résolu en un après-midi. La bibliothèque fait 6 Ko. Le temps gagné est incalculable.

### 5. **RTK Query change votre façon de penser les appels API**

Arrêtez d'écrire `useEffect(() => { fetch(...) }, [])` dans chaque composant. Déclarez le endpoint une fois. Obtenez le caching, les états de chargement, la gestion d'erreur, et la déduplication gratuitement. Le changement de modèle mental en vaut la peine.

### 6. **Le TTL du cache compte pour l'UX**

- Détails d'œuvre : cache 10 minutes (ils ne changent jamais)
- Listes d'œuvres : cache 5 minutes (l'utilisateur pourrait affiner les filtres)
- Liste de départements : cache 1 heure (vraiment statique)

Mauvais TTL = soit données obsolètes soit trop d'appels API.

### 7. **La synchronisation d'URL est une exigence produit, pas un bonus**


---

## Structure du projet

```
met-collection-explorer/
├── src/
│   ├── api/
│   │   └── metApi.ts           # Endpoints RTK Query
│   ├── components/
│   │   ├── ArtCard.tsx         # Carte d'œuvre individuelle
│   │   ├── ArtGrid.tsx         # Layout grille avec états de chargement
│   │   ├── FilterPanel.tsx     # Tous les contrôles de filtre
│   │   ├── Toolbar.tsx         # Pills de filtres actifs
│   │   └── Pagination.tsx      # Navigation de page
│   ├── hooks/
│   │   ├── redux.ts            # Hooks Redux typés
│   │   └── useUrlSync.ts       # Sync URL ↔ Redux avec nuqs
│   ├── store/
│   │   ├── index.ts            # Configuration du store
│   │   └── slices/
│   │       ├── filtersSlice.ts # État de filtre
│   │       └── searchSlice.ts  # État de pagination
│   ├── styles/
│   │   ├── tokens.css          # Variables du système de design
│   │   └── global.css          # Styles de base
│   ├── types/
│   │   └── met.types.ts        # Interfaces TypeScript
│   ├── utils/
│   │   └── urlParams.ts        # Helpers de sérialisation d'URL
│   ├── App.tsx
│   └── main.tsx                # Point d'entrée avec NuqsAdapter
├── server/
│   ├── index.js                # Serveur HTTP Node.js
│   └── scripts/
│       └── migrate.js          # Migration CSV → Postgres
├── Dockerfile                   # Build production en deux étapes
├── vite.config.ts              # Vite avec proxy /api
├── tsconfig.json               # TypeScript mode strict
└── package.json
```

---


## Licence

Licence MIT - n'hésitez pas à utiliser ce code pour vos propres projets.

---

## Remerciements

- **L'équipe de Claude Sonnet 4.5** pour leur intelligence artificielle générative, qui a contribué à simplifier et accélérer le développement
- **The Metropolitan Museum of Art** pour leur incroyable programme Open Access et API
- **Les mainteneurs de nuqs** pour avoir résolu la synchronisation d'état URL une fois pour toutes
- **L'équipe Redux Toolkit** pour avoir rendu Redux réellement agréable à utiliser
- **La communauté React** pour d'innombrables ressources et discussions

---

## Liens

- 🎨 [Programme Open Access MET](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access)
- 📚 [Documentation API MET](https://metmuseum.github.io/)
- 🔧 [Documentation nuqs](https://nuqs.47ng.com/)
- 🔴 [Docs Redux Toolkit](https://redux-toolkit.js.org/)
- 🐳 [Meilleures pratiques Docker](https://docs.docker.com/develop/dev-best-practices/)
- ☁️ [Docs Google Cloud Run](https://cloud.google.com/run/docs)

---

