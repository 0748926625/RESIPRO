# Residence Pro

PWA de gestion de résidences meublées : logiciel professionnel pour propriétaires/gérants
+ marketplace de réservation pour les clients, avec un système original de **réservation
partagée à deux personnes maximum par créneau**. Nom temporaire, voir [Configuration
plateforme](#configuration-plateforme).

Cahier des charges complet : [`PROMPT.txt`](./PROMPT.txt).

## Architecture

- **Next.js 16** (App Router, TypeScript strict, Turbopack), **Tailwind CSS v4**
- **Supabase** : PostgreSQL, Auth, Storage, Realtime, Row Level Security
- **Zod** pour la validation (frontend + serveur)
- **Vitest** pour les tests

Routes par rôle (segments réels, pas des groupes de routes, pour éviter toute collision
d'URL) :

| Segment | Rôle | Protection |
|---|---|---|
| `/` , `/residences`, `/login`, `/register` | Visiteur / public | aucune |
| `/client/*` | Client | `src/proxy.ts` (session) + `src/app/client/layout.tsx` (rôle) |
| `/owner/*` | Propriétaire / gérant | idem |
| `/admin/*` | Super Admin | idem |

La logique métier critique (disponibilité, création de réservation, réservation
partagée, confirmation de paiement) vit dans des **fonctions PostgreSQL `SECURITY
DEFINER`** (`supabase/migrations/0014_functions.sql`), jamais uniquement côté frontend
(§24, §41, §53 du cahier des charges). En particulier, la contrainte `EXCLUDE` GiST sur
`booking_segments` empêche tout chevauchement de créneau de façon atomique, y compris en
cas de requêtes concurrentes.

Arborescence :

```
supabase/migrations/   Schéma SQL, contrainte anti-chevauchement, RPC critiques, RLS
supabase/seed/         Données de référence dev (amenities, catégories de dépenses)
src/app/               Routes App Router (public / client / owner / admin / api)
src/lib/supabase/      Wrappers client (browser / server / service role)
src/lib/auth/          Résolution de session (getViewer) + garde de rôle (requireRole)
src/lib/constants/     Enums TypeScript miroir des enums Postgres (statuts, rôles)
src/lib/services/      Logique métier pure et testable (pas de React)
src/lib/validations/   Schémas Zod
src/proxy.ts           Rafraîchissement de session + protection de route (Next.js 16)
tests/                 Tests unitaires et d'intégration (Vitest)
```

## Installation

```bash
npm install
cp .env.example .env.local
```

## Variables d'environnement

Voir [`.env.example`](./.env.example). Nécessite un projet Supabase :

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` : **serveur uniquement**, ne jamais exposer au client ni
  commiter (§24)

## Supabase — migrations

```bash
npx supabase login
npx supabase link --project-ref <votre-ref>
npx supabase db push
```

Puis régénérer les types TypeScript :

```bash
npx supabase gen types typescript --linked > src/lib/types/database.types.ts
```

## Données de démonstration

`supabase/seed/dev_seed.sql` contient les données de référence (équipements, catégories
de dépenses) et peut être appliqué avec `psql` ou via le SQL Editor du dashboard
Supabase. Les comptes/résidences/réservations de démonstration nécessitent des lignes
`auth.users` réelles — donc un script utilisant la Service Role Key et l'API Admin de
Supabase Auth (à ajouter en Phase 2/3), jamais du SQL brut. Les données de test doivent
rester clairement séparées de la production (§38).

## Lancement local

```bash
npm run dev
```

## Tests

```bash
npm run test              # unitaires, purs, sans dépendance réseau
npm run test:integration  # contre le vrai projet Supabase (voir ci-dessous)
npm run typecheck
npm run lint
```

`npm run test` couvre uniquement `src/lib/services/*` (disponibilité, calendrier,
finances, dashboard) — aucune dépendance réseau, s'exécute n'importe où.

`npm run test:integration` (`tests/integration/`) s'exécute contre le **vrai** projet
Supabase lié : il crée des comptes/données de test isolés, vérifie les règles RLS et RPC
critiques (§39 : disponibilité, réservation, réservation partagée, max 2 participants,
permissions, paiements), puis nettoie tout. Nécessite `.env.local` — s'ignore
silencieusement si les identifiants Supabase ne sont pas présents (donc sûr à lancer sans
configuration, y compris en CI sans secrets).

## Build

```bash
npm run build
npm run start
```

## Déploiement

**Production : https://residence-pro.vercel.app** (Vercel, plan Hobby).

Vercel est le choix naturel pour cette app : elle dépend fortement de fonctionnalités
Next.js qui nécessitent un vrai serveur (Server Actions, `proxy.ts`, rendu par requête
selon la session) — impossible sur un hébergeur purement statique (GitHub Pages,
Cloudflare Pages sans adaptateur, etc.).

### Déployer soi-même

```bash
npm i -g vercel
vercel link          # une seule fois, choisir/créer le projet
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production        # ex. https://votre-domaine.vercel.app
vercel env add NEXT_PUBLIC_APP_NAME production
vercel deploy         # aperçu
vercel deploy --prod  # production
```

Répéter les mêmes variables pour l'environnement `preview` si vous voulez que les
aperçus (branches/PR) fonctionnent aussi.

### Étapes manuelles après un premier déploiement

1. **Redirections Supabase Auth** (Dashboard → Authentication → URL Configuration →
   Redirect URLs) : ajouter le domaine de production, ex. `https://votre-domaine.vercel.app/**`
   — sans ça, les liens de confirmation d'email et de réinitialisation de mot de passe
   pointent vers la mauvaise URL.
2. **Connexion GitHub ↔ Vercel** (Vercel Dashboard → Project → Settings → Git) : permet
   un déploiement automatique à chaque push sur `main`. La liaison automatique via CLI a
   échoué pour ce projet ; à connecter manuellement si souhaité.
3. **Mobile Money réel** : configurer les vraies coordonnées de paiement dans
   `/admin/settings` — jamais dans les variables d'environnement ni codées en dur (§31).

### Node.js

Le projet épingle `engines.node: "24.x"` dans `package.json`, aligné sur la version
recommandée par Vercel au moment du déploiement. Si `npm install` échoue sur Vercel avec
une erreur `Invalid Version` sans autre détail, régénérer `package-lock.json`
(`rm -rf node_modules package-lock.json && npm install`) résout généralement un état de
verrouillage incohérent avec le registre npm.

## Rôles

| Rôle | Description |
|---|---|
| **super_admin** | Administration plateforme, validation des résidences, intermédiaire financier, confirmation des paiements |
| **owner** | Propriétaire/gérant : ses résidences, son calendrier, ses finances |
| **client** | Recherche, réservation classique ou partagée, paiement de sa part |
| **visiteur** | Consultation publique, sans compte |

## Réservation partagée — règles

- Maximum **2 participants**, jamais 3 (`trg_check_max_segments` en base).
- Créneaux **consécutifs** et **non chevauchants**, validés côté serveur par la
  fonction `join_shared_booking_request` et garantis atomiquement par une contrainte
  `EXCLUDE` GiST — jamais par une simple vérification frontend.
- Chaque participant paie sa propre part et reçoit une référence Mobile Money dédiée
  (`RES-2026-00125-A` / `-B`).
- Paiement Mobile Money **manuel** dans ce MVP : le client déclare avoir payé, le Super
  Admin vérifie hors-bande et confirme. "Paiement reçu" ne signifie pas "résidence
  réservée" : le Super Admin ne réserve auprès du propriétaire qu'une fois tous les
  paiements requis confirmés.

## Configuration plateforme

Nom, logo, couleurs, contact, opérateur/numéro Mobile Money et commission sont stockés
dans la table `platform_settings` (clé/valeur), modifiables par le Super Admin — jamais
codés en dur dans l'application (§31, §32).

## PWA

`src/app/manifest.ts` et `public/sw.js` rendent l'app installable (icônes générées via
`next/og`, aucun fichier image à maintenir). Le service worker ne met en cache que les
fichiers statiques `_next/static/*` et une page `/offline` de secours pour la navigation
— jamais les données de réservation, paiement ou disponibilité, qui doivent toujours
venir du serveur (§26, §40). Pour tester l'installation, lancez `npm run build && npm run
start` (le service worker ne s'enregistre pas correctement en mode `next dev`), ouvrez le
site dans Chrome/Edge et utilisez « Installer l'application ».

## État d'avancement

Voir les phases du cahier des charges (§48). Phases 1 à 11, 13 et 14 sont implémentées et
vérifiées contre le projet Supabase réel : authentification, gestion des résidences,
disponibilités/calendrier, réservation classique et partagée, paiements Mobile Money
manuels, intermédiation, caisse/revenus/dépenses, tableaux de bord, notifications, et PWA
installable (manifest, icônes générées, service worker à stratégie de cache limitée —
voir `public/sw.js`). Restent : Phase 12 (états financiers consolidés multi-résidences —
actuellement disponibles par résidence), Phase 16 (durcissement sécurité/tests/
performance) et Phase 17 (déploiement).
