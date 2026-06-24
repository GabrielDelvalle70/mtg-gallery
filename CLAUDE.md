# CLAUDE.md — MTG Gallery

Guía para Claude Code cuando trabaje en este repo. Léase **antes** de proponer cambios.

---

## Qué es

Galería virtual de cartas de Magic: The Gathering. Frontend en React 18 + Vite + Tailwind, backend Node/Express que proxea la API pública de [Scryfall](https://scryfall.com/docs/api) con caché en memoria + auth propio (SQLite + JWT) + tracking de colección por usuario. Monorepo con scripts root que arrancan client + server con `concurrently`.

**No** es un proyecto aj-framework. **No** usa Redux/Zustand/TanStack Query. **No** necesita API key de Scryfall.

### Funcionalidades

- **Galería**: búsqueda + filtros + paginación contra Scryfall (en `/`, sólo para usuarios autenticados; sin sesión `/` muestra la landing).
- **Auth**: registro/login propios (email + username), JWT en localStorage, expira en 7d. Sin sesión, `/` muestra landing.
- **Mi Colección** (`/collection`): browser de sets por año con progreso, filtros *Todos / Con cartas / Completos*, vista detalle por set con toggle por carta. Cartas no poseídas se muestran en grayscale. Botón **Exportar** que abre un modal para bajar la colección como **CSV o JSON** autocontenido (resuelve la data de cada carta on-demand vía Scryfall; ver patrones).
- **Estadísticas** (`/stats`): dashboard de la colección — resumen (total, sets iniciados/completos, % completitud, valor USD estimado) + bar charts de curva de maná, rareza, color, tipo y top sets. La data de cada carta (rareza/color/cmc/tipo/precio) **no** está en la DB: se trae on-demand vía bulk fetch a Scryfall.
- **Mazos** (`/decks`, `/decks/:id`): constructor de mazos. Lista de mazos (crear con nombre + formato, eliminar) y editor por mazo con buscador Scryfall para agregar cartas, steppers de cantidad, panel de stats (curva de maná, colores) + **validación de legalidad** por formato constructed (legal/baneada/restringida, máx 4 copias, mínimo 60 cartas), **exportar decklist** (texto MTGO/Moxfield o Arena, copiar o descargar `.txt`) e **importar decklist** (pegar texto → resolver nombres contra Scryfall → poblar el mazo, modo agregar o reemplazar). Incluye **mazos competitivos de referencia** (`/decks/reference`): arquetipos curados a mano con cartas clave + link a la lista completa, y botón para crear un mazo base. Solo maindeck en el v1. **Restricción de colección**: solo se pueden agregar al mazo cartas que el usuario tenga en su colección — match **por nombre** (cualquier impresión cuenta). Aplica al agregado manual, al import y a "crear mazo base"; ver sección de patrones.
- **Wishlist** (`/wishlist`): lista de cartas deseadas. Se agrega/quita desde el **detalle de carta** (`CardDetailPage`, botón "Agregar a lista de deseados"). La página `/wishlist` muestra las cartas en **grilla** (como la galería) o **lista** (diferenciadas por set + año), con quitar por carta; el modo se persiste en `localStorage`. Al agregar una carta a la colección, sale de la wishlist automáticamente (transacción `acquireCard` en el server). Reusa el bulk fetch de stats.
- **Dónde comprar** (`/stores`): tiendas online curadas + tiendas físicas vía dos fuentes (lista curada + OSM/Overpass), dropdown de 23 países con coords de ciudad principal, Geolocation API + reverse geocoding (Nominatim) para autodetectar país, fallback al [localizador WPN](https://locator.wizards.com).
- **Sidebar de navegación**: layout global con sidebar colapsable (persiste en `localStorage`) en `lg:` y horizontal en mobile. Visible sólo para usuarios autenticados.

---

## Stack y restricciones

| Capa     | Decisión                                                          | No usar                            |
|----------|-------------------------------------------------------------------|------------------------------------|
| Frontend | React 18, Vite, Tailwind, React Router 6                          | CRA, Next.js, MUI/Chakra           |
| Estado   | React Context + `useReducer` (Theme, Auth, Wishlist, Collection, Cache, Filters) | Redux, Zustand, Jotai, Recoil |
| Data     | `fetch` nativo + `AbortController` + retry custom (`useFetch.js`) | axios, TanStack Query, SWR         |
| Backend  | Express 4, `fetch` nativo de Node 18+, Map + TTL                  | Fastify, Koa, ORM, Redis           |
| Auth     | JWT (`jsonwebtoken`) en localStorage + `bcryptjs` (cost 12)       | Passport, NextAuth, sesiones server-side |
| DB       | SQLite vía `better-sqlite3` (síncrono, file at `data/app.db`)     | ORM (Prisma, Drizzle), Postgres, Redis |
| Estilo   | Tailwind con `darkMode: 'class'`                                  | styled-components, CSS modules     |

Si el cambio requiere agregar una dep, **proponé primero**. La filosofía del proyecto es no agregar paquetes innecesarios (ver `package.json` de cada workspace).

---

## Comandos

Desde la raíz `mtg-gallery/`:

```powershell
npm run install:all     # instala root + client + server
npm run dev             # Vite :5173 + Express :3001 (proxy /api → :3001)
npm run build           # client/dist
npm start               # producción: Express sirve dist + endpoints /api
```

`npm run dev` arranca ambos con `concurrently`. Vite hace proxy de `/api/*` al server, así que el cliente siempre llama a rutas relativas (`/api/scryfall/...`) — **no** uses URLs absolutas a localhost en el código del cliente.

---

## Red corporativa (Grupo Vierci) — TLS MITM

**Crítico para entornos corporativos**: la red de Grupo Vierci intercepta HTTPS con un cert raíz propio. Node nativo **no consulta el cert store de Windows**, así que `fetch('https://api.scryfall.com')` falla con:

```
fetch failed → self-signed certificate in certificate chain
```

PowerShell sí funciona porque usa Windows TLS, lo que confunde el diagnóstico. La solución que sí funciona:

1. Existe `server/certs/windows-ca-bundle.pem` con las CAs del store local. Si no existe (clon fresco), regenerarlo:
   ```powershell
   $out = "server\certs\windows-ca-bundle.pem"
   New-Item -ItemType Directory -Path (Split-Path $out) -Force | Out-Null
   $stores = 'Cert:\LocalMachine\Root','Cert:\LocalMachine\CA','Cert:\CurrentUser\Root','Cert:\CurrentUser\CA'
   $seen = @{}; $lines = New-Object System.Collections.Generic.List[string]
   foreach ($s in $stores) {
     Get-ChildItem $s -EA SilentlyContinue | ForEach-Object {
       if (-not $seen.ContainsKey($_.Thumbprint)) {
         $seen[$_.Thumbprint] = $true
         $lines.Add("-----BEGIN CERTIFICATE-----")
         $lines.Add([Convert]::ToBase64String($_.RawData, 'InsertLineBreaks'))
         $lines.Add("-----END CERTIFICATE-----")
       }
     }
   }
   [IO.File]::WriteAllLines($out, $lines, [Text.ASCIIEncoding]::new())
   ```

2. Los scripts `server/package.json` ya usan `cross-env NODE_EXTRA_CA_CERTS=./certs/windows-ca-bundle.pem node --env-file=./.env ...`. **El cert va por `cross-env`, NO por `--env-file`** — la variable de cert debe estar en el OS env **antes** de que Node inicialice TLS; `--env-file` la carga demasiado tarde (probado, no funciona). Las demás vars (`JWT_SECRET`, etc.) sí se cargan por `--env-file` sin problema, porque se leen en runtime.

3. **Nunca** usar `NODE_TLS_REJECT_UNAUTHORIZED=0` ni `rejectUnauthorized:false`. El bundle da validación real contra la CA corporativa.

4. `server/certs/*.pem`, `server/.env` y `data/` están en `.gitignore`. El bundle es específico de máquina; el `.env` contiene el `JWT_SECRET` (no comitear); `data/` es la SQLite.

---

## Auth & sesión

- **Server** ([server/src/routes/auth.js](server/src/routes/auth.js)): `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` (Bearer). Password se hashea con `bcryptjs` (cost 12). JWT firmado con `JWT_SECRET` (definido en `server/.env`), expira en `JWT_EXPIRES_IN` (default `7d`).
- **DB** ([server/src/db/database.js](server/src/db/database.js)): SQLite en `data/app.db` (en la raíz del repo, **fuera de `server/`** para que `node --watch` no reinicie cuando SQLite escribe WAL/db files). Las tablas se crean al boot con `CREATE TABLE IF NOT EXISTS`; no hay sistema de migraciones — agregar `ALTER TABLE` ahí mismo si necesitás cambios de schema. **Patrón de migración** (ya usado para `user_cards.name`): chequear con `PRAGMA table_info(tabla)` si la columna existe y sólo entonces hacer `ALTER TABLE ... ADD COLUMN`; las filas viejas quedan con la columna NULL y se completan con un backfill (ver más abajo).
- **Cliente** ([client/src/context/AuthContext.jsx](client/src/context/AuthContext.jsx)): token y user en localStorage (`mtg-gallery:token`, `mtg-gallery:user`). Al cargar la app rehidrata llamando a `/me` con el token guardado; si devuelve 401 limpia el storage. Mientras `hydrating` es true, las rutas muestran `<Loader/>` para evitar parpadeo de la landing.
- **Wrappers de ruta** ([client/src/App.jsx](client/src/App.jsx)):
  - `HomeRoute` — en `/`: muestra `HomePage` (gallery) si hay sesión, `LandingPage` si no.
  - `GuestOnly` — envuelve `/login` y `/register`; si ya hay sesión redirige a `/`.
  - `RequireAuth` — envuelve `/collection*` y `/stores`; si no hay sesión redirige a `/login` con `state.from`.
- **JWT_SECRET**: cualquier cambio en `JWT_SECRET` invalida **todas** las sesiones existentes (los tokens viejos no validan). Si rotás el secret, los usuarios tendrán que loguearse de nuevo. No es un bug, es lo esperado.

---

## Estructura

```
mtg-gallery/
├── client/
│   ├── src/
│   │   ├── components/   # CardGrid, CardItem, CardModal, SearchBar, Filters, ManaCost, Pagination, Loader, ErrorBoundary, Header, Sidebar, ThemeToggle, GridSkeleton, SortControls, LoginTransition, CollectionCardItem, WishlistCardItem, CollectionExportModal
│   │   ├── pages/        # HomePage, CardDetailPage, LandingPage, LoginPage, RegisterPage, CollectionPage, CollectionSetPage, CollectionStatsPage, WishlistPage, DecksPage, ReferenceDecksPage, DeckEditorPage, StoresPage
│   │   ├── context/      # ThemeContext, AuthContext, WishlistContext, CollectionContext, CacheContext, FiltersContext  (orden de wrap en main.jsx: Auth > Wishlist > Collection > Cache > Filters; Collection depende de useAuth Y useWishlist)
│   │   ├── hooks/        # useDebounce, useFetch, usePagination, useIntersectionObserver, useLocalStorage, useGeolocation
│   │   ├── services/     # scryfall.js, auth.js, collection.js, wishlist.js, decks.js, geocode.js, overpass.js  (URL builders + API helpers)
│   │   ├── data/         # stores.js (tiendas curadas + COUNTRIES + haversineKm), referenceDecks.js (arquetipos competitivos curados)
│   │   └── utils/        # format, colors, rarity, mana, deckExport, deckImport, collectionExport (CSV/JSON), ownership (match de propiedad por nombre)
│   ├── index.html        # preconnect a api.scryfall.com + cards.scryfall.io
│   ├── vite.config.js    # proxy /api → localhost:3001; chunk manual react/router
│   └── tailwind.config.js  # darkMode 'class'; paleta mtg.{white,blue,black,red,green,mythic,rare,uncommon,common}; keyframes orbit/pulseRing/riseIn para LoginTransition
├── server/
│   ├── src/
│   │   ├── routes/scryfall.js    # /search, /cards/:id, /cards/named, /sets, /sets/:code, /symbology, /catalog/:name, POST /collection (bulk)
│   │   ├── routes/auth.js        # /register, /login, /me
│   │   ├── routes/collection.js  # /cards (GET, POST, DELETE), /stats — todas requireAuth; POST usa acquireCard (quita de wishlist)
│   │   ├── routes/wishlist.js    # /cards (GET, POST, DELETE) — todas requireAuth
│   │   ├── routes/decks.js       # / (GET, POST), /:id (GET, PATCH, DELETE), /:id/cards (PUT) — requireAuth + ownership
│   │   ├── routes/geocode.js     # /reverse — proxy a Nominatim (lat/lon → countryCode/countryName)
│   │   ├── routes/overpass.js    # /shops — proxy a Overpass API (shops con tag collector/games en radio)
│   │   ├── middleware/auth.js    # requireAuth — verifica Bearer JWT
│   │   ├── middleware/cache.js   # in-memory + Cache-Control
│   │   ├── middleware/rateLimit.js  # 120/seg por IP
│   │   ├── cache/memoryCache.js  # Map + TTL + GC cada 60s
│   │   ├── db/database.js        # SQLite init + migración name + queries preparadas (users, user_cards[+name], user_wishlist, decks, deck_cards) + transacciones acquireCard / setDeckCard / importDeck
│   │   └── db/backfillNames.js   # backfill best-effort de user_cards.name vía Scryfall (al boot, fire-and-forget)
│   ├── certs/            # bundle PEM (gitignored)
│   ├── .env              # NODE_EXTRA_CA_CERTS + JWT_SECRET + JWT_EXPIRES_IN (gitignored)
│   └── server.js         # serves /api en dev, también dist/ en prod (NODE_ENV=production); fatal si !JWT_SECRET
├── data/                 # SQLite database (gitignored — fuera de server/ para evitar restarts de --watch)
│   └── app.db
└── package.json          # scripts root (concurrently)
```

---

## Patrones del proyecto (no-obvios)

### Estado global en 6 contextos separados
- `ThemeContext` — tema light/dark, persistido en `localStorage`, default `prefers-color-scheme`.
- `AuthContext` — token + user, persistido en `localStorage`. Rehidrata con `/api/auth/me` al boot. Expone `authenticate`, `registerAccount`, `commitSession`, `logout`, `isAuthenticated`, `hydrating`. **Importante**: `authenticate`/`registerAccount` validan credenciales y devuelven `{ token, user }` pero **no** commitean la sesión; `commitSession({token,user})` es lo que setea `isAuthenticated` (ver nota de `LoginTransition` para el porqué).
- `WishlistContext` — `Set<cardId>` con las cartas deseadas. Mismo patrón que Collection (toggle optimista + rollback, resetea en logout). Expone además `dropLocal(id)`: quita un id del Set **sin** pegarle al server, usado por Collection al adquirir una carta (el server ya la sacó en `acquireCard`). Va envuelto **dentro** de Auth y **fuera** de Collection.
- `CollectionContext` — `Set<cardId>` con las cartas que el user posee + counts por set. Toggle hace **update optimista** con rollback en caso de error del server. Al **adquirir** (agregar) una carta, llama `wishlist.dropLocal(id)` para sincronizar la wishlist (que el server quitó en la misma transacción). Resetea al hacer logout. Depende de `AuthContext` **y** `WishlistContext`, por eso va envuelto **dentro** de ambos en `main.jsx`.
- `FiltersContext` — `useReducer` con acciones `SET`, `TOGGLE_COLOR`, `RESET`, `HYDRATE`. Cualquier cambio de filtro **resetea `page` a 1** automáticamente en el reducer (excepto cuando se setea `page` explícitamente).
- `CacheContext` — wrapper de doble nivel: Map en memoria + localStorage como fallback. TTL por entrada. **No** es un store de datos; es solo caché de respuestas HTTP, usado por `useFetch`.

Si necesitás compartir estado entre componentes, **revisá primero si ya cabe en uno de estos contextos** antes de crear uno nuevo.

### `useFetch` + caché
Todos los GETs van por `useFetch(url, { ttlMs, deps })`:
- Lee de `CacheContext` antes de pegar; si hay hit, no hace fetch.
- En miss hace `fetch` con reintentos (429 + 5xx, backoff lineal 250ms × intento).
- Cancela requests obsoletos con `AbortController`.
- El servidor también cachea (5 min default), así que hay dos capas.

No uses `fetch()` directo en componentes; siempre `useFetch`.

### Traducción UI → DSL de Scryfall (`buildScryfallQuery`)
`client/src/services/scryfall.js::buildScryfallQuery(state)` convierte el `FiltersContext.state` a la sintaxis de búsqueda de Scryfall (`r:mythic c:ru year>=2020 t:dragon legal:standard`). Para añadir un filtro nuevo:

1. Agregar campo a `INITIAL_STATE` en `FiltersContext.jsx`.
2. Extender `buildScryfallQuery` traduciendo el campo al [DSL Scryfall](https://scryfall.com/docs/syntax).
3. Añadir el control en `Filters.jsx`.

**No** filtres en cliente lo que Scryfall puede filtrar en el query — desperdicia ancho de banda y rompe la paginación.

### Paginación híbrida
Scryfall pagina de 175 cartas. El grid muestra 36/página. `HomePage.jsx` calcula `scryfallPage` desde `state.page` (página de UI) y hace `slice` localmente del bloque de 175. Esto significa que pasar de UI-página 4 a 5 puede no requerir un fetch nuevo si caen en el mismo bloque.

Si tocás esto, mantené ambos números (`PAGE_SIZE_DISPLAY=36` en `HomePage`, `SCRYFALL_PAGE_SIZE=175` en `services/scryfall.js`) sincronizados.

### Ordenamiento mixto server/client
La mayoría de los `order` van en el query a Scryfall (`order=released&dir=desc`). **Excepción**: `order='rarity'` se ordena localmente porque Scryfall no soporta orden por rareza con dirección reversa de forma consistente. Ver `HomePage.jsx::useMemo(cards)`.

### Imágenes adaptativas
`CardItem.jsx` usa `srcSet` con `small/normal/large` + `IntersectionObserver` para no instanciar `<img>` fuera de viewport. La grilla original de Scryfall es lenta sin esto.

### `React.memo` por defecto
Casi todos los componentes presentacionales están memoizados: `CardItem`, `CollectionCardItem`, `CardGrid`, `SearchBar`, `Filters`, `SortControls`, `Pagination`, `ManaCost`, `CardModal`. Si agregás un componente nuevo en `components/`, considerá `memo` salvo que tenga estado interno que cambia mucho.

### Auth en requests al backend
Las llamadas a `/api/collection/*` requieren `Authorization: Bearer <token>`. El cliente NO usa `useFetch` para esto (porque `useFetch` lee de `CacheContext` sin headers de auth) — `CollectionContext` llama directo a `services/collection.js`. No agregar endpoints autenticados a `useFetch` sin extenderlo con un parámetro de headers.

### Paginación de set en `CollectionSetPage`
Para `/collection/:setCode` se necesitan **todas** las cartas del set, no solo la página actual de Scryfall (un set core tiene ~300 cartas, Scryfall pagina de 175). [`CollectionSetPage.jsx`](client/src/pages/CollectionSetPage.jsx) hace un loop secuencial que sigue `has_more` y acumula resultados (`setCards([...accum])` después de cada página), así el grid va apareciendo incrementalmente mientras se completa el fetch. Aborto correcto con `AbortController` si el user cambia de set antes de terminar.

### Detalle de carta desde la colección (`CollectionCardItem`)
Las cartas de la colección abren el **mismo detalle que la galería**: navegan a `/card/:id` con `state={{ card }}` para que [`CardDetailPage`](client/src/pages/CardDetailPage.jsx) reutilice la data ya cargada y se saltee el fetch (igual que [`CardItem`](client/src/components/CardItem.jsx)).

El truco no-obvio: [`CollectionCardItem`](client/src/components/CollectionCardItem.jsx) tiene un botón "Agregar/Quitar" como overlay, y anidar un `<button>` dentro de un `<a>` es HTML inválido. Se resuelve con un **stretched link**: el `<Link>` es un overlay absoluto `inset-0 z-10` (no envuelve el botón), y el botón toggle se sube a `z-20` para quedar clickeable por encima. El badge "En tu colección" y el caption inferior son visuales (sin z), quedan debajo del Link. Si agregás otro control interactivo sobre la carta, subilo a `z-20` también — si no, el Link se lo come.

[`WishlistCardItem`](client/src/components/WishlistCardItem.jsx) (vista grilla de la wishlist) usa **el mismo patrón stretched-link** para el botón "quitar" (`z-20` sobre el Link overlay). `CardItem` (galería) **no** tiene controles encima — es un `<Link>` simple; la wishlist se gestiona desde el detalle de carta, no desde la galería.

### Wishlist: espejo de Collection + auto-quitar al adquirir
[`WishlistContext`](client/src/context/WishlistContext.jsx) es un espejo de `CollectionContext` (toggle optimista contra `/api/wishlist/cards`).

**Dónde se agrega/quita:** el control vive en el **detalle de carta** ([`CardDetailPage`](client/src/pages/CardDetailPage.jsx)) — botón "Agregar a lista de deseados" / "Quitar de lista de deseados", visible sólo si `isAuthenticated`. La galería (`CardItem`) **no** lo tiene (decisión de UX de Gabriel: menos ruido en la grilla). En la página `/wishlist` también se puede quitar (botón por carta en ambas vistas).

**Auto-quitar al adquirir:** al agregar una carta a la colección, sale de la wishlist. Atómico server-side en la transacción `acquireCard` (`db/database.js`) que dispara el `POST /api/collection/cards` — `INSERT user_cards` + `DELETE user_wishlist` juntos. El cliente lo refleja con `wishlist.dropLocal(id)` (sin request extra). Por eso el orden de providers es **Auth > Wishlist > Collection**: Collection consume `useWishlist()`.

**Página `/wishlist`** ([`WishlistPage`](client/src/pages/WishlistPage.jsx)): toggle **Grilla / Lista** (persistido en `localStorage` key `mtg-gallery:wishlist-view`). Grilla usa `WishlistCardItem` (mismo look que la galería). Lista usa `WishlistRow` (definido inline) con thumbnail + nombre + **set (código) + año + rareza** + botón quitar. Reusa `fetchCardsByIds` con un **cache local id→carta** (`useRef(Map)`) sólo para saber qué IDs faltan (quitar una carta no re-fetchea todo).

**Pitfall ya pisado** — las cartas mostradas viven en **`state`** (`setCards`), igual que `CollectionStatsPage`, **no** en un `useMemo` sobre el ref. Derivar de `ref + forceRender` fallaba en **dev/StrictMode**: el memo no recomputa si sus deps no cambian, y como StrictMode aborta el primer fetch, `fetching` quedaba en `false` antes de que llegaran los datos → la grilla quedaba vacía aunque el contador mostrara cartas. Si reusás `fetchCardsByIds` en otra página, guardá el resultado en state, no derivado de un ref.

### Mazos: data page-local (sin context global) + validación de legalidad
A diferencia de colección/wishlist (que necesitan estado app-wide para la galería), los mazos **no** tienen un context global — [`DecksPage`](client/src/pages/DecksPage.jsx) y [`DeckEditorPage`](client/src/pages/DeckEditorPage.jsx) fetchean directo con `decksApi` ([`services/decks.js`](client/src/services/decks.js)) usando el `token` de `useAuth`. Si en el futuro hace falta un badge de cantidad de mazos en otra vista, recién ahí conviene un context.

**Persistencia incremental:** cada cambio de cantidad hace un `PUT /api/decks/:id/cards` (`{cardId, setCode, quantity}`, 0 = quitar) con **update optimista + rollback** (igual patrón que collection toggle). No hay "guardar"; cada stepper persiste solo. La transacción `setDeckCard` (`db/database.js`) hace el upsert/delete + `touch updated_at`. **Ownership**: todos los endpoints de `/:id` verifican `getOwned(id, userId)` antes de tocar nada (404 si no es tuyo) — no confiar en el cliente.

**Data de carta:** el editor trae la data completa de las cartas del mazo con `fetchCardsByIds` (al abrir) y la **siembra** desde los resultados del buscador al agregar (el objeto card de Scryfall ya viene completo). El buscador interno reusa `useFetch(searchUrl(...))` con `url=null` cuando no hay query (skip).

**Validación de legalidad** (`legalityCheck` en `DeckEditorPage`, formatos constructed): por carta mira `card.legalities[format]` (`banned`/`not_legal`/`restricted`), regla de **máx 4 copias** (tierras básicas exentas, detectadas por `type_line` con `Basic` + `Land`) y **mínimo 60 cartas**. Las stats (curva/colores) son ponderadas por cantidad y **excluyen tierras** de la curva y del breakdown de color. Formatos válidos están duplicados en server (`decks.js::FORMATS`) y cliente (`services/decks.js::FORMATS`) — **mantenerlos en sync**. Commander quedó fuera del v1 (singleton + 100 cartas + comandante = caso especial).

**Exportar decklist** ([`utils/deckExport.js`](client/src/utils/deckExport.js) + `ExportModal` en `DeckEditorPage`): genera texto desde `deckList`. Dos formatos: `mtgo` (`"4 Lightning Bolt"`, sirve para Moxfield/MTGO) y `arena` (`"4 Lightning Bolt (M21) 159"` con set + collector_number; usa el nombre de la cara frontal para transform/mdfc/adventure, nombre completo para split). Copiar al portapapeles (`navigator.clipboard`) o descargar `.txt` (Blob + anchor, sin deps). Todo client-side — no hay endpoint de export. Si alguna carta aún no cargó su data, el modal avisa.

**Mazos de referencia** ([`data/referenceDecks.js`](client/src/data/referenceDecks.js) + [`ReferenceDecksPage`](client/src/pages/ReferenceDecksPage.jsx), ruta `/decks/reference` linkeada desde `DecksPage`): arquetipos competitivos **curados a mano** (no fabricar — mismo principio que `stores.js`). Cada entrada tiene formato, colores, descripción, **cartas clave** (las definitorias/estables del arquetipo, con cantidad) y `source` (link al metagame de MTGGoldfish con la lista completa, que rota). No son listas de 60 cartas: son referencia/semilla. "Crear mazo base" reusa toda la infra: resuelve las cartas clave con `fetchCardCollection({name})`, crea el mazo (`decksApi.create`) e importa (`decksApi.import` modo `add`), y navega al editor. Los nombres de cartas clave deben coincidir con Scryfall (verificado: las 38 actuales resuelven). Ruta `/decks/reference` va **antes** de `/decks/:id` en App.jsx (igual el static gana al dinámico en RR v6).

**Importar decklist** ([`utils/deckImport.js`](client/src/utils/deckImport.js) + `ImportModal` en `DeckEditorPage`): pegar texto → `parseDecklist` (cantidad opcional + nombre, soporta `4 Lightning Bolt`, `4x …`, Arena `4 … (SET) 159`, líneas sin cantidad = 1; ignora comentarios `//`/`#` y headers de sección; mergea duplicados por nombre) → resolver vía `fetchCardCollection(lines.map(l => ({name: l.name})))` (el endpoint `POST /cards/collection` resuelve por `{name}`, no sólo `{id}`) → `matchResolved` empareja las cartas devueltas con las cantidades (matchea por nombre completo, cara frontal o parte antes de `//`) y arma la lista de no encontradas. Persiste con **un solo** `POST /api/decks/:id/import` (`{cards, mode}`, transacción `importDeck`), no N requests. Modos: `add` (suma, clamp 99, via `addCard` con `ON CONFLICT … MIN(99, …)`) o `replace` (vacía el mazo y setea). El cliente **pre-filtra a las cartas poseídas** antes de mandar (ver regla de colección abajo) y muestra resumen (importadas / copias / **no en tu colección** / no encontradas). Tras importar, el editor hace `refreshDeck()` (re-GET autoritativo + fetch de cartas faltantes).

### Mazos: solo cartas de tu colección (match por nombre)
Al armar un mazo **solo se pueden agregar cartas que el usuario tenga en su colección**. El match es **por nombre** (cualquier impresión cuenta): todas las impresiones de una carta comparten `card.name` en Scryfall, así que la **clave de propiedad** es `card.name` normalizado (minúsculas + trim). Si tenés *cualquier* impresión de "Lightning Bolt", podés agregar *cualquier* impresión de "Lightning Bolt". Helper: [`utils/ownership.js`](client/src/utils/ownership.js) (`nameKey`, `ownsCard`).

**Por qué por nombre y no por impresión:** la colección guarda propiedad por impresión (`card_id`), pero al deckbuildear lo que importa es la carta, no la edición puntual. Match por `card_id` sería friccionante (tenés el Bolt de M10 pero el buscador muestra el de M21). Decisión de Gabriel (sesión 2026-06-02).

**El nombre tuvo que agregarse al modelo.** `user_cards` antes era solo `card_id + set_code`; se agregó la columna **`name`** (migración vía `PRAGMA table_info` + `ALTER TABLE`). Se completa:
- **Forward:** el cliente manda `card.name` en `POST /api/collection/cards`; se guarda en `acquireCard`.
- **Backfill:** las filas previas a la migración quedan con `name` NULL; [`server/src/db/backfillNames.js`](server/src/db/backfillNames.js) las resuelve contra Scryfall (`POST /cards/collection`, lotes de 75) **al boot**, fire-and-forget desde `server.js` (no bloquea el arranque; si falla la red/cert se reintenta al próximo boot). Mientras el backfill no corra, una carta vieja sin `name` no matchea y no se puede deckbuildear hasta que se complete.

**Enforcement en cliente:**
- `CollectionContext` expone `ownedNames` (`Set` de claves de nombre) y `ownsName(name)`. Se construye al cargar la colección (el GET ahora devuelve `name`) y se mantiene en updates optimistas con un `useRef(Map<card_id, nameKey>)` — necesario porque varias `card_id` pueden compartir nombre: al quitar una impresión, el nombre sigue "poseído" si tenés otra. Recalcular el `Set` desde los values del Map evita perder eso.
- `DeckEditorPage`: el buscador (`SearchRow`) muestra **todas** las cartas de Scryfall pero las no poseídas salen atenuadas con chip "No la tenés" y sin botón Agregar. En el mazo (`DeckRow`) el botón **+** se deshabilita si no poseés la carta (permite mazos legacy con cartas que ya no tenés: se pueden **reducir/quitar** pero no aumentar). `setQty` valida client-side al aumentar.
- `ImportModal` y `ReferenceDecksPage` ("crear mazo base") filtran a poseídas con `ownsName`, mandan solo esas y reportan las salteadas. En referencia, si se saltea alguna, **no** navega directo: muestra un banner con el resumen + botón "Abrir mazo".

**Enforcement en server (fuente de verdad):**
- `PUT /api/decks/:id/cards` recibe `name` y valida `collectionQueries.ownsName` **solo al aumentar** la cantidad (compara contra `deckQueries.cardQty`): reducir/quitar nunca se bloquea. 403 si no poseés la carta.
- `POST /api/decks/:id/import` valida cada carta con `ownsName`, saltea las no poseídas y devuelve `skipped`. No es 400 si todo se saltea por no-poseído (request válido, 0 importadas); 400 solo si nada vino bien formado. En `replace`, si no hay nada poseído para poner, **no vacía** el mazo.
- **Límite del enforcement:** el server valida ownership por el `name` que manda el cliente (la autoridad es el contenido de `user_cards`, no se puede afirmar propiedad de un nombre que no está). Un cliente que mintiera el `name` de un `card_id` podría colar una carta — pero es un mazo privado y una regla auto-impuesta (hacer trampa solo te perjudica a vos), así que es un borde aceptado, no un boundary de seguridad.

### Estadísticas: data de carta on-demand, no en la DB
La tabla `user_cards` sólo guarda `card_id + set_code` — **no** rareza/color/cmc/tipo/precio. Para las stats por rareza/color/curva/tipo, [`CollectionStatsPage`](client/src/pages/CollectionStatsPage.jsx) trae la data completa de cada carta poseída vía `fetchCardsByIds()` ([`services/scryfall.js`](client/src/services/scryfall.js)), que batchea los IDs en grupos de **75** (límite de Scryfall) y los POSTea a `/api/scryfall/collection` → Scryfall `POST /cards/collection`. Reporta progreso (`done/total`) y aborta con `AbortController` si cambian los IDs.

Esto **no** usa `useFetch` (es POST, no GET) ni se cachea server-side (el `cacheMiddleware` es GET-only). Los IDs salen de `CollectionContext.ownedIds` (expuesto en el value del context — agregado para esta página). Si necesitás más campos de carta en otra vista, reusá `fetchCardsByIds` en vez de pegarle uno por uno a `/cards/:id`.

Decisión deliberada: **no** guardar metadata de carta en la DB (evita migración + backfill de cartas existentes; la data viene siempre fresca de Scryfall). El costo es un fetch al abrir `/stats`.

Las agregaciones viven en `aggregate()` dentro de la página (curva excluye tierras; color usa buckets exclusivos sobre `card.colors`; tipo toma el primer match de prioridad sobre `type_line`, usando la cara frontal en DFC). Los charts son `div`s puros con width %, **sin librería de charts** (respeta la filosofía no-deps).

### Exportar colección: CSV/JSON autocontenido, data on-demand
[`CollectionExportModal`](client/src/components/CollectionExportModal.jsx) (abierto desde el botón **Exportar** en [`CollectionPage`](client/src/pages/CollectionPage.jsx)) baja la colección como CSV o JSON. **Mismo trade-off que Stats**: `user_cards` no guarda rareza/precio/tipo, así que el modal resuelve la data completa de cada carta poseída con `fetchCardsByIds(ownedIds)` (batch de 75, progreso `done/total`, `AbortController`) al abrir — reusa la infra, no la duplica.

El armado del texto vive en [`utils/collectionExport.js`](client/src/utils/collectionExport.js): `toExportRow(card)` aplana a un registro estable (12 columnas: name, set, set_name, collector_number, rarity, mana_cost, cmc, colors, type_line, price_usd, scryfall_id, **scryfall_uri**), `buildCollectionCsv` (con escaping de comillas/comas/saltos + orden estable nombre→set→nº con `localeCompare numeric`) y `buildCollectionJson` (pretty 2-spaces). DFC toma la cara frontal para mana/tipo. **Autocontenido** = cada fila incluye `scryfall_uri`, así el archivo sirve fuera de la app.

La descarga reusa `downloadText(filename, text, mime)` de [`deckExport.js`](client/src/utils/deckExport.js) — se le agregó el 3er param `mime` (default `text/plain`, retrocompatible) para servir `text/csv` / `application/json`. Si querés otro export a archivo, reusá `downloadText` con su MIME. **No** se exporta sólo desde la DB (faltaría la metadata útil); el costo es un fetch al abrir el modal, igual que `/stats`.

### Presentación de `StoresPage`: listas, no grillas
Ambas secciones ("Tiendas online y oficiales" y "Tiendas físicas") se muestran como **lista** — un contenedor único con borde redondeado y filas separadas por `divide-y`, con hover de fondo por fila — **no** como grilla de tarjetas. El componente de fila físico es `StoreRow` (antes `StoreCard`). Mantené ese formato si tocás la sección; la data (curada + OSM, distancia, chips OSM/Curada) no cambió.

### Animación post-login (`LoginTransition`) — commit diferido de sesión
Después de validar credenciales, [`LoginPage`](client/src/pages/LoginPage.jsx) y [`RegisterPage`](client/src/pages/RegisterPage.jsx) renderizan [`LoginTransition`](client/src/components/LoginTransition.jsx) — overlay full-screen con orbes de maná orbitando + mensaje de bienvenida — durante 2.5s y luego commitean la sesión + `navigate(...)`.

**El bug no-obvio que esto resuelve** (ya pisado una vez): si `authenticate` commiteara la sesión de una (seteando `isAuthenticated`), el wrapper `GuestOnly` que envuelve `/login` y `/register` redirige a `/` **en el mismo render**, desmontando `LoginTransition` antes de que corra el `setTimeout` → la animación se ve casi instantánea. Por eso `authenticate`/`registerAccount` **no** commitean: devuelven `{token, user}`, se muestra la animación con `isAuthenticated` aún en `false`, y recién en el callback del `setTimeout` se llama `commitSession(session)` + `navigate(redirectTo)` (commit y navegación juntos, batcheados, para que no haya carrera entre `GuestOnly`→`/` y la navegación a `state.from`).

Si tocás el delay, sincronizá con los keyframes (`orbit`, `pulseRing`, `riseIn` en [`tailwind.config.js`](client/tailwind.config.js)) para evitar cortes feos. Si agregás otra ruta `GuestOnly`, recordá este patrón: cualquier animación de bienvenida montada dentro de una ruta `GuestOnly` necesita el commit diferido.

### Layout: Sidebar como app shell
[`App.jsx`](client/src/App.jsx) envuelve `<Sidebar />` + `<main>` en un flex `lg:flex-row` (vertical) y `flex-col` (horizontal en mobile/tablet). Header y footer quedan full-width. El sidebar **solo se renderiza si `isAuthenticated && !hydrating`** — landing/login/register son full-width sin nav. El estado colapsado de [`Sidebar.jsx`](client/src/components/Sidebar.jsx) persiste en `localStorage` (`mtg-gallery:sidebar-collapsed`); en `lg:` la sidebar alterna entre 80px (icons-only, con `title` tooltip nativo) y 224px. En mobile siempre se ve horizontal con labels.

Si agregás una nueva sección autenticada, sumá la entry en `NAV_ITEMS` de Sidebar.jsx (NO en el Header — la navegación principal vive en el sidebar).

**Pie del sidebar:** debajo de la nav hay un pie con el **toggle de tema** y el **link a Scryfall API** (movidos desde el Header), con el mismo estilo de fila que los items de nav (clases en `rowClass`/`labelClass`, colapsan a icono en `lg:`). Como el sidebar solo existe autenticado, esos dos controles quedan **también en el Header pero solo para usuarios sin sesión** (landing/login/register no tienen sidebar). Resultado: la barra superior autenticada muestra **solo nombre de usuario + Salir**.

### Patrón "query point" en `StoresPage`
[`StoresPage.jsx`](client/src/pages/StoresPage.jsx) decide dónde buscar tiendas según un `queryPoint` derivado:
- Si hay GPS (`coords`) → usa `coords.lat/lon`.
- Si no, usa `mainCity` del país seleccionado en el dropdown (Toronto para Canadá, Tokio para Japón, etc. — coords hardcodeadas en `COUNTRIES` de [`stores.js`](client/src/data/stores.js)).

Al cambiar el `queryPoint`, un `useEffect` cancela el AbortController previo y dispara `/api/overpass/shops` para refrescar. Las tiendas curadas + OSM se combinan en una sola grilla, sorted por distancia ascendente con Haversine.

### Tiendas: dos fuentes complementarias
- **Curadas** ([`stores.js::PHYSICAL_STORES`](client/src/data/stores.js)): editadas a mano, verificadas, mostradas con chip verde "Curada". Solo agregar tiendas que se puedan verificar — **no fabricar datos**.
- **OSM (OpenStreetMap)**: via Overpass query por shops con tag `shop=collector` o `shop=games`. Aportes comunitarios — la cobertura varía (Toronto tiene 45+ resultados, Paraguay tiene 0). Mostradas con chip azul "OSM"; si no tienen `website` el link cae a OpenStreetMap.

Para países sin data (curada ni OSM), siempre se muestra el panel de fallback al [localizador WPN oficial](https://locator.wizards.com) — esa es la fuente verdadera para "encontrar mi tienda local".

### APIs externas siempre via proxy del backend
El cliente nunca habla directo con Scryfall, Nominatim ni Overpass. Todas pasan por `/api/{scryfall,geocode,overpass}/*`. Esto da:
- Manejo del cert MITM corporativo (los fetch del cliente usan el TLS del browser, pero el server tiene el bundle PEM).
- Caché compartido vía el middleware existente (Nominatim 24h, Overpass 24h, Scryfall 5min).
- User-Agent meaningful para servicios que lo piden (Nominatim, Overpass tienen políticas de uso).

Si agregás otra API externa, seguí el patrón: nuevo router en `server/src/routes/`, `cacheMiddleware`, helper en `client/src/services/`.

---

## Cosas que NO hacer

- **No** agregar dependencias sin proponerlo primero (axios, lodash, date-fns, framer-motion, etc.).
- **No** romper la separación cliente/servidor; el cliente nunca debe hablar con `api.scryfall.com` directamente, siempre vía `/api/scryfall/*`.
- **No** poner secretos en código ni en `.env` versionado. `JWT_SECRET` vive en `server/.env` (gitignored). Si rotás, todas las sesiones se invalidan.
- **No** confiar en el estado de propiedad del lado cliente para autorizar nada — el server es la fuente de verdad. `CollectionContext.has(id)` es para UI, no para autorización.
- **No** asumir que `fetch` funciona — leer la sección de red corporativa.
- **No** tocar `server/certs/`, `server/.env` ni `data/` con datos a comitear; los tres son por-máquina (gitignored).
- **No** mover `data/` adentro de `server/` — `node --watch` reinicia el proceso cada vez que SQLite escribe (WAL files), rompe requests en vuelo. Mantener `data/` en la raíz del repo.
- **No** agregar endpoints autenticados a `useFetch` sin extenderlo con headers — no manda `Authorization` y caché es por URL (mezclaría datos entre users).
- **No** fabricar datos de tiendas en [`stores.js`](client/src/data/stores.js). Solo incluir tiendas que se puedan verificar (con address, website, etc.). Para cobertura global, ya está integrado OSM via Overpass.
- **No** agregar links de nav al Header. La navegación principal vive en [`Sidebar.jsx`](client/src/components/Sidebar.jsx). Autenticado, el Header es solo identidad de marca + nombre de usuario + Salir; el toggle de tema y el link a Scryfall viven en el **pie del sidebar** (en el Header quedan solo para usuarios sin sesión).
- **No** crear archivos `.md` de planning/notas; trabajo desde la conversación.

---

## Endpoints del backend (referencia rápida)

### Scryfall proxy

Todos bajo `/api/scryfall/*`, GET con caché 5 min, Cache-Control `public, max-age=300`:

| Ruta                                             | Scryfall                  |
|--------------------------------------------------|---------------------------|
| `/search?q=&order=&dir=&page=&unique=`           | `/cards/search`           |
| `/cards/:id`                                     | `/cards/:id`              |
| `/cards/named?exact=` / `?fuzzy=`                | `/cards/named`            |
| `/sets`                                          | `/sets`                   |
| `/sets/:code`                                    | `/sets/:code`             |
| `/symbology`                                     | `/symbology`              |
| `/catalog/:name`                                 | `/catalog/:name`          |
| `POST /collection` `{identifiers:[…]}` máx 75 | `POST /cards/collection` (bulk; identifiers por `{id}` o `{name}`/`{name,set}`; **no** cacheado, es POST) |
| `/api/health` (sin prefijo scryfall)             | —                         |

Para añadir un endpoint nuevo, editar `server/src/routes/scryfall.js`: tomar el patrón `proxy(req, res, next, () => ...)`. El middleware de caché se aplica al router entero.

### Auth (`/api/auth/*`)

| Método | Ruta        | Body / Headers                                  | Respuesta                          |
|--------|-------------|-------------------------------------------------|------------------------------------|
| POST   | `/register` | `{ email, username, password }`                 | `{ token, user }` (201)            |
| POST   | `/login`    | `{ identifier (email o username), password }`   | `{ token, user }` (200)            |
| GET    | `/me`       | `Authorization: Bearer <token>`                 | `{ user }` (200)                   |

Validaciones: email regex básico, username `^[a-zA-Z0-9_]{3,24}$`, password ≥ 8 chars. Errores: 400 (validación), 401 (credenciales), 409 (email/username ya existe).

### Colección (`/api/collection/*`) — todas requireAuth

| Método | Ruta              | Body / Params                  | Respuesta                          |
|--------|-------------------|--------------------------------|------------------------------------|
| GET    | `/cards`          | —                              | `{ cards: [{id, setCode, name}, ...] }`  |
| POST   | `/cards`          | `{ cardId, setCode, name? }`   | `{ ok: true }` (201, idempotente) |
| DELETE | `/cards/:cardId`  | —                              | 204                                |
| GET    | `/stats`          | —                              | `{ total, bySet: { lea: 5, ... } }` |

`setCode` se persiste en lowercase. El POST usa `INSERT OR IGNORE` así re-agregar la misma carta no falla. **El POST también quita la carta de la wishlist** (transacción `acquireCard`). `name` (opcional) se guarda para validar propiedad por nombre al armar mazos; si falta lo completa el backfill al boot (ver patrón de mazos).

### Wishlist (`/api/wishlist/*`) — todas requireAuth

| Método | Ruta              | Body / Params                  | Respuesta                          |
|--------|-------------------|--------------------------------|------------------------------------|
| GET    | `/cards`          | —                              | `{ cards: [{id, setCode}, ...] }`  |
| POST   | `/cards`          | `{ cardId, setCode }`          | `{ ok: true }` (201, idempotente) |
| DELETE | `/cards/:cardId`  | —                              | 204                                |

Espejo de colección sin `/stats`. Una carta sale de la wishlist automáticamente al agregarla a la colección (ver `POST /api/collection/cards`).

### Mazos (`/api/decks/*`) — todas requireAuth + ownership

| Método | Ruta            | Body / Params                          | Respuesta                                            |
|--------|-----------------|----------------------------------------|------------------------------------------------------|
| GET    | `/`             | —                                      | `{ decks: [{id, name, format, cardCount, updatedAt}] }` |
| POST   | `/`             | `{ name, format }`                     | `{ deck: {id, name, format, cards: []} }` (201)      |
| GET    | `/:id`          | —                                      | `{ deck: {id, name, format, ..., cards:[{id,setCode,quantity}]} }` |
| PATCH  | `/:id`          | `{ name?, format? }`                   | `{ deck }` (merge parcial)                           |
| DELETE | `/:id`          | —                                      | 204                                                  |
| PUT    | `/:id/cards`    | `{ cardId, setCode, quantity, name }`  | `{ ok: true, quantity }` (quantity 0 = quitar; **403** si no poseés la carta y aumentás) |
| POST   | `/:id/import`   | `{ cards:[{cardId,setCode,quantity,name}], mode }` | `{ ok:true, imported, skipped, mode }` (mode `add`\|`replace`; `skipped` = no poseídas) |

`format` validado contra `FORMATS` (standard/pioneer/modern/legacy/vintage/pauper) → 400 si inválido. Todo `/:id` devuelve 404 si el mazo no es del usuario. **Solo se pueden agregar cartas poseídas** (match por nombre): el PUT valida `name` contra la colección al aumentar la cantidad (403 si no), el import saltea las no poseídas (`skipped`). Ver patrón "Mazos: solo cartas de tu colección".

### Geocoding (`/api/geocode/*`) — público

| Método | Ruta        | Query                    | Respuesta                                            |
|--------|-------------|--------------------------|------------------------------------------------------|
| GET    | `/reverse`  | `lat`, `lon` (requeridos)| `{ countryCode: 'PY', countryName: 'Paraguay' }`     |

Proxy a [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org) con `zoom=3` (resolución país) y `accept-language=es`. Cache 24h. Devuelve 400 si lat/lon no son números.

### Tiendas OSM (`/api/overpass/*`) — público

| Método | Ruta      | Query                                 | Respuesta                                |
|--------|-----------|---------------------------------------|------------------------------------------|
| GET    | `/shops`  | `lat`, `lon`, `radius` (m, max 200k)  | `{ shops: [{id, name, address, city, lat, lon, website, osmTag, source: 'osm'}] }` |

Proxy a [Overpass API](https://overpass-api.de) buscando nodes y ways con tag `shop=collector` o `shop=games`. Cache 24h. Cobertura variable: Toronto ~45 resultados, Asunción 0 (depende de aportes comunitarios a OSM).

---

## Verificación post-cambio

```powershell
npm run dev
# Esperar 5-8s a que Vite + Express arranquen
curl http://localhost:3001/api/health
curl "http://localhost:3001/api/scryfall/search?q=lightning+bolt&page=1"
# Browser: http://localhost:5173
```

Si el segundo curl devuelve 500 con `"error":"fetch failed"`, **es el cert corporativo** (ver sección dedicada). Si el server no arranca y loguea `FATAL: JWT_SECRET no está definido`, revisar [server/.env](server/.env).

Para verificar el flujo de auth + colección end-to-end:

```powershell
# Register
$body = @{ email='test@test.dev'; username='tester'; password='supersecret' } | ConvertTo-Json
$reg = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method Post -ContentType "application/json" -Body $body
$h = @{ Authorization = "Bearer $($reg.token)" }

# Add a card to collection
Invoke-RestMethod -Uri "http://localhost:3001/api/collection/cards" -Method Post -Headers $h `
  -ContentType "application/json" -Body (@{ cardId='abc-123'; setCode='LEA' } | ConvertTo-Json)

# List + stats
Invoke-RestMethod -Uri "http://localhost:3001/api/collection/cards" -Headers $h
Invoke-RestMethod -Uri "http://localhost:3001/api/collection/stats" -Headers $h
```

---

## Backlog / próximos pasos

Hay una lista de ideas candidatas en la sección **Roadmap** del [README.md](README.md): exportar colección, vistas recientes, command palette, PWA, etc. Al retomar el proyecto, **preguntar a Gabriel cuál arrancar** antes de implementar.

**Hecho:**
- ✅ *Estadísticas de colección* (`/stats`) — ver sección de patrones.
- ✅ *Wishlist* (`/wishlist`) — ver sección de patrones.
- ✅ *Construcción de mazos* (`/decks`) — ver sección de patrones. v1: solo maindeck, formatos constructed.
- ✅ *Exportar decklist* (modal en el editor de mazos) — texto MTGO/Moxfield o Arena, copiar/descargar.
- ✅ *Importar decklist* (modal en el editor) — pegar texto, resolver por nombre, modo agregar/reemplazar.
- ✅ *Exportar colección* (modal en `/collection`) — CSV o JSON autocontenido; ver sección de patrones.

Próximas candidatas sugeridas: *vistas recientes*, o extender mazos (sideboard, Commander).
