# MTG Gallery — Galería Virtual de Cartas de Magic: The Gathering

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)

Aplicación full-stack para explorar el catálogo completo de cartas de **Magic: The Gathering** usando la API pública de [Scryfall](https://scryfall.com/docs/api). Incluye registro/login propio (JWT + SQLite), tracking de colección personal por usuario (sets por año, cartas no poseídas en grayscale), **estadísticas de colección**, **wishlist**, **constructor de mazos** (con validación de legalidad e importar/exportar decklists), **exportar la colección a CSV/JSON** y un buscador global de tiendas físicas combinando datos curados con [OpenStreetMap](https://www.openstreetmap.org).

Frontend en **React 18 + Vite + Tailwind** con sidebar global colapsable, backend **Node.js + Express** que combina varios proxies con caché en memoria + auth + persistencia de colección, wishlist y mazos.

> Proyecto personal de aprendizaje. No está afiliado a Wizards of the Coast ni a Scryfall.

---

## Inicio rápido

Requiere **Node.js 18+** y **npm 9+**.

```bash
# 1. Clonar
git clone https://github.com/GabrielDelvalle70/mtg-gallery.git
cd mtg-gallery

# 2. Instalar dependencias (root + client + server)
npm run install:all

# 3. Configurar el server (ver "Variables de entorno" más abajo)
#    Crear server/.env con al menos un JWT_SECRET.

# 4. Levantar en modo desarrollo (Vite :5173 + Express :3001)
npm run dev
```

Luego abrí <http://localhost:5173>. El backend no requiere API key de Scryfall.

---

## Stack

| Capa     | Tecnología                                                     |
|----------|----------------------------------------------------------------|
| Frontend | React 18, Vite, TailwindCSS, React Router 6                    |
| Estado   | React Context + `useReducer` (Theme, Auth, Wishlist, Collection, Filters, Cache) |
| Backend  | Node.js 18+, Express, fetch nativo, caché Map + TTL            |
| Auth     | JWT (`jsonwebtoken`) en localStorage + `bcryptjs` (cost 12)    |
| DB       | SQLite vía `better-sqlite3` (file en `data/app.db`)            |
| API      | Scryfall (gratuita, sin API key, ~150 req/s por IP)            |

---

## Estructura

```
mtg-gallery/
├── client/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/     # CardGrid, CardItem, CollectionCardItem, WishlistCardItem, CollectionExportModal, CardModal, SearchBar, Filters, Sidebar, LoginTransition...
│   │   ├── pages/          # HomePage, CardDetailPage, LandingPage, LoginPage, RegisterPage, CollectionPage, CollectionSetPage, CollectionStatsPage, WishlistPage, DecksPage, ReferenceDecksPage, DeckEditorPage, StoresPage
│   │   ├── context/        # ThemeContext, AuthContext, WishlistContext, CollectionContext, FiltersContext, CacheContext
│   │   ├── hooks/          # useDebounce, useFetch, usePagination, useIntersectionObserver, useGeolocation, useLocalStorage
│   │   ├── services/       # scryfall.js, auth.js, collection.js, wishlist.js, decks.js, geocode.js, overpass.js
│   │   ├── data/           # stores.js (listas curadas + países con mainCity + Haversine), referenceDecks.js (arquetipos competitivos)
│   │   └── utils/          # format, colors, rarity, mana, deckExport, deckImport, collectionExport, ownership
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── server/                 # Express
│   ├── src/
│   │   ├── routes/scryfall.js     # /api/scryfall/* — proxy a Scryfall (incluye POST /collection bulk)
│   │   ├── routes/auth.js         # /api/auth/* — register, login, me
│   │   ├── routes/collection.js   # /api/collection/* — cards CRUD + stats
│   │   ├── routes/wishlist.js     # /api/wishlist/* — cards CRUD
│   │   ├── routes/decks.js        # /api/decks/* — CRUD de mazos + cards + import bulk
│   │   ├── routes/geocode.js      # /api/geocode/* — reverse geocoding (Nominatim)
│   │   ├── routes/overpass.js     # /api/overpass/* — tiendas OSM (Overpass)
│   │   ├── middleware/auth.js     # requireAuth (verifica Bearer JWT)
│   │   ├── middleware/cache.js    # Cache-Control + in-memory
│   │   ├── middleware/rateLimit.js
│   │   ├── cache/memoryCache.js   # Map + TTL + GC periódico
│   │   └── db/database.js         # SQLite init + queries (users, user_cards, user_wishlist, decks, deck_cards) + transacciones
│   ├── certs/                     # bundle PEM (gitignored)
│   ├── .env                       # NODE_EXTRA_CA_CERTS + JWT_SECRET (gitignored)
│   └── server.js
├── data/                          # SQLite database (gitignored — fuera de server/ para evitar restarts de --watch)
│   └── app.db
├── package.json            # Scripts root (concurrently)
└── .vscode/settings.json
```

---

## Instalación

Requiere **Node.js 18+** y **npm 9+**.

```powershell
# Desde la raíz del proyecto
npm run install:all
```

Esto instala dependencias en `root`, `client` y `server` en una sola pasada.

---

## Redes corporativas (proxy MITM TLS)

Si tu red corporativa intercepta HTTPS con un cert raíz propio (Zscaler, Fortinet, etc.), Node fallará al hablar con Scryfall con `self-signed certificate in certificate chain`. La solución: exportar la cadena del store de Windows a un bundle PEM y apuntar `NODE_EXTRA_CA_CERTS` allí.

```powershell
# Desde mtg-gallery/, exporta TODAS las CAs confiables a un bundle
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

`server/.env` ya viene preconfigurado con `NODE_EXTRA_CA_CERTS=./certs/windows-ca-bundle.pem` (más `JWT_SECRET`). Los scripts del server usan `cross-env NODE_EXTRA_CA_CERTS=... node --env-file=./.env ...` — el cert va por **cross-env** (debe estar en el OS env antes de que Node inicialice TLS), las demás vars por **`--env-file`** (se leen en runtime). El bundle y el `.env` están en `.gitignore`.

### Variables de entorno (`server/.env`)

```ini
NODE_EXTRA_CA_CERTS=./certs/windows-ca-bundle.pem
JWT_SECRET=<hex aleatorio de 64 chars>
JWT_EXPIRES_IN=7d
```

El server hace `process.exit(1)` si `JWT_SECRET` no está definido. Para generar uno:

```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

---

## Comandos

```powershell
# Desarrollo (Vite en :5173 + Express en :3001 con proxy /api)
npm run dev

# Build de producción del frontend (genera client/dist)
npm run build

# Producción: Express sirve client/dist + endpoints /api
npm start
```

Modo desarrollo:
- Vite escucha en `http://localhost:5173` y enruta `/api/*` al server Express.
- Express escucha en `http://localhost:3001` y reenvía a `https://api.scryfall.com`.

Modo producción:
- `NODE_ENV=production npm start` sirve los assets estáticos compilados.

---

## Endpoints del Backend

### Scryfall proxy (`/api/scryfall/*`)

Todos GET, con caché de 5 min + headers `Cache-Control: public, max-age=300`.

| Ruta                          | Scryfall equivalente                  | Descripción                          |
|-------------------------------|---------------------------------------|--------------------------------------|
| `GET /search?q=&order=&dir=&page=` | `/cards/search`                  | Búsqueda con sintaxis Scryfall       |
| `GET /cards/:id`              | `/cards/:id`                          | Carta por ID                         |
| `GET /cards/named?exact=&fuzzy=` | `/cards/named`                     | Búsqueda por nombre exacto / fuzzy   |
| `GET /sets`                   | `/sets`                               | Listado completo de sets             |
| `GET /sets/:code`             | `/sets/:code`                         | Set específico                       |
| `GET /symbology`              | `/symbology`                          | Símbolos de maná                     |
| `GET /catalog/:name`          | `/catalog/:name`                      | Catálogos (artist-names, etc.)       |
| `POST /collection`            | `/cards/collection`                   | Bulk: identifiers por `{id}` o `{name}` (máx 75); no cacheado |
| `GET /api/health`             | —                                     | Health check                         |

### Auth (`/api/auth/*`)

| Método | Ruta        | Body / Headers                                  | Respuesta                |
|--------|-------------|-------------------------------------------------|--------------------------|
| POST   | `/register` | `{ email, username, password }`                 | `{ token, user }` (201)  |
| POST   | `/login`    | `{ identifier (email o username), password }`   | `{ token, user }` (200)  |
| GET    | `/me`       | `Authorization: Bearer <token>`                 | `{ user }` (200)         |

Validaciones: email regex básico, username `^[a-zA-Z0-9_]{3,24}$`, password ≥ 8 chars. Passwords hasheadas con `bcryptjs` (cost 12).

### Colección (`/api/collection/*`) — requiere `Authorization: Bearer <token>`

| Método | Ruta              | Body / Params           | Respuesta                              |
|--------|-------------------|-------------------------|----------------------------------------|
| GET    | `/cards`          | —                       | `{ cards: [{id, setCode}, ...] }`      |
| POST   | `/cards`          | `{ cardId, setCode }`   | `{ ok: true }` (201, idempotente)      |
| DELETE | `/cards/:cardId`  | —                       | 204                                    |
| GET    | `/stats`          | —                       | `{ total, bySet: { lea: 5, ... } }`    |

El `POST /cards` además quita la carta de la wishlist si estaba (transacción `acquireCard`).

### Wishlist (`/api/wishlist/*`) — requiere `Authorization: Bearer <token>`

| Método | Ruta              | Body / Params           | Respuesta                              |
|--------|-------------------|-------------------------|----------------------------------------|
| GET    | `/cards`          | —                       | `{ cards: [{id, setCode}, ...] }`      |
| POST   | `/cards`          | `{ cardId, setCode }`   | `{ ok: true }` (201, idempotente)      |
| DELETE | `/cards/:cardId`  | —                       | 204                                    |

### Mazos (`/api/decks/*`) — requiere `Authorization: Bearer <token>` + ownership

| Método | Ruta            | Body / Params                                  | Respuesta                                            |
|--------|-----------------|------------------------------------------------|------------------------------------------------------|
| GET    | `/`             | —                                              | `{ decks: [{id, name, format, cardCount, updatedAt}] }` |
| POST   | `/`             | `{ name, format }`                             | `{ deck }` (201)                                     |
| GET    | `/:id`          | —                                              | `{ deck: {..., cards:[{id, setCode, quantity}]} }`   |
| PATCH  | `/:id`          | `{ name?, format? }`                           | `{ deck }`                                           |
| DELETE | `/:id`          | —                                              | 204                                                  |
| PUT    | `/:id/cards`    | `{ cardId, setCode, quantity }`                | `{ ok, quantity }` (quantity 0 = quitar)             |
| POST   | `/:id/import`   | `{ cards:[{cardId,setCode,quantity}], mode }`  | `{ ok, imported, mode }` (mode `add`\|`replace`)     |

Formatos válidos: `standard`, `pioneer`, `modern`, `legacy`, `vintage`, `pauper`. Todo `/:id` devuelve 404 si el mazo no es del usuario.

### Geocoding y tiendas OSM (`/api/geocode/*`, `/api/overpass/*`) — público

| Método | Ruta                          | Query                                  | Respuesta                                            |
|--------|-------------------------------|----------------------------------------|------------------------------------------------------|
| GET    | `/geocode/reverse`            | `lat`, `lon`                           | `{ countryCode, countryName }`                       |
| GET    | `/overpass/shops`             | `lat`, `lon`, `radius` (m, max 200k)   | `{ shops: [{id, name, address, city, lat, lon, website, osmTag, source}] }` |

Ambos cachean 24h. `/geocode/reverse` proxea a [Nominatim](https://nominatim.openstreetmap.org). `/overpass/shops` proxea a [Overpass API](https://overpass-api.de) buscando nodes/ways con tag `shop=collector` o `shop=games`.

---

## Funcionalidades implementadas

### Galería pública

1. **Grid responsivo** — 2 → 6 columnas según viewport, imágenes adaptativas (`small`/`normal`/`large` via `srcSet`).
2. **Búsqueda** con debounce de 300 ms.
3. **Filtros combinables**: rareza, set, año, color (multi-select), tipo, legalidad.
4. **Ordenamiento**: fecha de lanzamiento, nombre, rareza, set, precio USD, popularidad EDH.
5. **Vista de detalle** en `/card/:id` con coste de maná renderizado, texto Oracle, flavor, precios USD/EUR/Foil, legalidades, artista, links externos (Scryfall, Gatherer, EDHREC).
6. **Paginación** server-side (Scryfall pagina de 175 en 175; el cliente subdivide en páginas de 36).

### Auth & landing

7. **Landing pública** en `/` para visitantes no autenticados — hero con CTAs a registro e inicio de sesión.
8. **Registro y login propios** — JWT en localStorage (expira en 7d), password hasheada con bcrypt.
9. **Animación post-login** — overlay full-screen con orbes de maná orbitando antes de redirigir a la galería.
10. **Rehidratación de sesión** — al cargar la app, el cliente revalida el token contra `/api/auth/me` y limpia si expiró.

### Mi Colección (`/collection`, requiere sesión)

11. **Browser de sets agrupados por año** con buscador y filtros *Todos los sets / Con cartas en mi colección / Completos*, ícono del set y progress bar `X / Y · %`.
12. **Vista detalle por set** (`/collection/:code`) — carga incremental de **todas** las cartas del set (sigue `has_more` de Scryfall), filtros *Todas / En mi colección / Faltantes*, hero con progreso global.
13. **Toggle por carta** — cartas no poseídas aparecen en `grayscale` + opacidad reducida; al marcar vuelven a color con chip "En tu colección". Update optimista con rollback en caso de error del server.
13b. **Detalle de carta desde la colección** — click en cualquier carta (poseída o no) abre la misma vista de detalle que la galería (`/card/:id`, reutilizando la data ya cargada). El botón Agregar/Quitar sigue funcionando sin abrir el detalle (stretched link + z-index).
13c. **Exportar colección** — botón en `/collection` que abre un modal para descargar la colección como **CSV** (planilla) o **JSON** autocontenido. Cada fila resuelve la metadata completa de la carta on-demand contra Scryfall (nombre, set, rareza, coste, color, tipo, precio USD, `scryfall_uri`).

### Estadísticas de colección (`/stats`, requiere sesión)

14. **Dashboard de la colección** — resumen (total de cartas, sets iniciados/completos, % de completitud, valor estimado en USD) + bar charts (sin libs, `div`s puros) de **curva de maná, rareza, color, tipo y top sets**. La data de cada carta (rareza/color/cmc/tipo/precio) se trae on-demand de Scryfall vía bulk fetch (`POST /cards/collection` batcheado de a 75), no se persiste en la DB.

### Wishlist (`/wishlist`, requiere sesión)

15. **Lista de deseados** — se agrega/quita desde el detalle de carta (botón "Agregar a lista de deseados"). Toggle optimista con rollback, mismo patrón que la colección.
16. **Vista grilla o lista** — la página muestra las cartas como grilla (igual que la galería) o como lista (diferenciadas por set + año), modo persistido en `localStorage`, con quitar por carta. Al agregar una carta a la colección, sale de la wishlist automáticamente (transacción atómica en el server).

### Mazos (`/decks`, `/decks/:id`, requiere sesión)

17. **Constructor de mazos** — lista de mazos (crear con nombre + formato, eliminar) y editor por mazo con buscador Scryfall interno para agregar cartas, steppers de cantidad y persistencia incremental (cada cambio se guarda solo, optimista + rollback).
18. **Stats + validación de legalidad** — curva de maná y colores (ponderados por cantidad, excluyendo tierras) + chequeo por formato constructed: legal/baneada/restringida, máx 4 copias (básicas exentas), mínimo 60 cartas.
19. **Importar / exportar decklist** — exportar a texto MTGO/Moxfield o Arena (copiar o descargar `.txt`); importar pegando una lista (resuelve nombres contra Scryfall, modo agregar o reemplazar, reporta no encontradas).
19b. **Mazos competitivos de referencia** (`/decks/reference`) — arquetipos curados a mano por formato (Modern, Pioneer, Legacy, Pauper) con colores, descripción, **cartas clave** y link a la lista completa actualizada (MTGGoldfish). Botón "Crear mazo base" que resuelve las cartas clave y arma un mazo nuevo de arranque. No son listas de 60 cartas: son referencia/semilla (las listas completas rotan y viven en la fuente).

### Dónde comprar (`/stores`, requiere sesión)

20. **Tiendas online y oficiales** — lista curada con 11 sitios incluyendo el [oficial de Wizards](https://magic.wizards.com), [WPN locator](https://locator.wizards.com), Hasbro Pulse, TCGPlayer, Cardmarket, Card Kingdom, Star City Games, ChannelFireball, Magic Madhouse, Magic Bazar, Mercado Libre LATAM. Presentadas como lista organizada (filas con separadores), no como grilla.
21. **Tiendas físicas — dos fuentes complementarias** (mismo formato de lista):
    - **Curadas**: lista verificada a mano (US/UK/FR por ahora) con chip verde.
    - **OSM (OpenStreetMap)**: query dinámica via Overpass API buscando shops con tag `shop=collector` o `shop=games` — cobertura global, depende de aportes comunitarios (Toronto ~45 resultados; Paraguay 0).
22. **Dropdown de 23 países** con coords de ciudad principal; al cambiar país se requery OSM alrededor de esa ciudad.
23. **Geolocation API** — botón *Usar mi ubicación* → reverse geocoding via Nominatim para autodetectar país, luego sort por distancia (Haversine) desde tu posición real.
24. **Fallback al locator WPN** para países sin data (curada ni OSM).

### Navegación y layout

25. **Sidebar global colapsable** — visible para usuarios autenticados; en `lg:` alterna entre 80px (icons-only con tooltip) y 224px expandido, el estado persiste en `localStorage`. En mobile se vuelve barra horizontal scrollable. La navegación principal vive acá (NO en el Header).
26. **Header** — sólo marca, theme toggle y auth state (username chip + Salir / Iniciar sesión + Registro). Sin nav.

### Transversales

27. **Caché doble**: in-memory Map en cliente + localStorage con TTL (fallback offline) + Map en servidor.
28. **Estados**: loading skeletons, errores con reintento, sin-resultados, error boundary global.
29. **Tema claro/oscuro** persistente con `prefers-color-scheme` como default.
30. **Optimizaciones**:
    - `React.memo` en componentes presentacionales.
    - `Suspense + lazy` para rutas.
    - `IntersectionObserver` para carga progresiva de imágenes.
    - `fetch` con reintentos (429 / 5xx) y backoff lineal.
    - Vite chunking manual de `react`/`react-dom`/`react-router`.

---

## Cómo añadir un filtro nuevo

1. Agregar el campo al `INITIAL_STATE` en `client/src/context/FiltersContext.jsx`.
2. Extender `buildScryfallQuery()` en `client/src/services/scryfall.js` traduciendo el campo al [DSL de búsqueda de Scryfall](https://scryfall.com/docs/syntax). Ejemplo: `power: 'pow>=3'`, `format: 'f:standard'`.
3. Añadir el control en `client/src/components/Filters.jsx`.

`buildScryfallQuery` ya filtra `page: 1` automáticamente al cambiar cualquier filtro (vía el reducer).

---

## Notas de Scryfall

- **Sin API key**, pero respeta el rate limit: ~10 req/seg sostenidas y un pico máximo de ~150/s. El middleware `rateLimit.js` evita exceso desde el cliente.
- Las imágenes se sirven desde `cards.scryfall.io` (CDN). Hay un `<link rel="preconnect">` en `index.html`.
- La sintaxis de búsqueda es muy expresiva: `t:dragon c:r year>=2020 r:mythic`, `is:commander`, `pow>=5`, etc.
- Endpoints fuera del proxy (no necesarios para esta app): bulk-data, autocomplete, rulings.

---

## Decisiones arquitectónicas

- **Proxy en lugar de fetch directo desde el cliente**: centraliza caché, esquiva CORS para futuros endpoints autenticados, permite agregar telemetría y rate limiting.
- **Context + useReducer en lugar de Redux**: el estado global es acotado (6 contextos: Theme, Auth, Wishlist, Collection, Filters, Cache). Más liviano que el setup de Redux Toolkit para este tamaño de app. Los mazos **no** usan context global (se fetchean page-local) porque no se necesitan en toda la app.
- **JWT en localStorage en lugar de cookies de sesión**: encaja con el patrón existente de fetch + headers, sin necesidad de `cookie-parser` ni configurar CORS con `credentials: true`. Trade-off conocido: vulnerable a XSS — para mitigarlo, evitamos `dangerouslySetInnerHTML` y todo input del usuario va por React (escapado por defecto).
- **SQLite en lugar de Postgres/MySQL**: cero infra externa para correr el proyecto, file-based, suficiente para un proyecto de aprendizaje. `better-sqlite3` es síncrono — más simple que callbacks/promises de drivers async — y muy rápido para reads.
- **`data/` en la raíz, no en `server/`**: SQLite escribe WAL files (`.db-shm`, `.db-wal`) en cada commit, lo que dispararía `node --watch` y reiniciaría el server mid-request. Manteniéndolo en la raíz, `--watch server/` ignora esos cambios.
- **Update optimista en CollectionContext**: marcar una carta es una acción frecuente; esperar el round-trip del server hace que el toggle se sienta laggy. El cliente actualiza el `Set<id>` inmediatamente y revierte si el server rechaza.
- **Caché en dos capas**: el server cachea respuestas crudas de Scryfall (5 min) y el cliente cachea respuestas ya parseadas + persiste en localStorage para arrancar offline-first en visitas repetidas.
- **Paginación híbrida**: Scryfall devuelve páginas de 175 cartas; el grid muestra 36 por página y subdivide localmente para reducir requests.
- **`buildScryfallQuery` como capa de traducción**: separa el modelo del UI de los filtros del DSL de Scryfall, fácil de extender.
- **Sidebar como app shell vs links en Header**: la navegación principal vive en `Sidebar.jsx`. El Header queda limpio y reservado para identidad/auth/tema. En lg+ la sidebar es colapsable (estado persiste en localStorage); en mobile se vuelve barra horizontal con scroll para no robar pantalla.
- **Tiendas: dos fuentes complementarias en vez de una sola "perfecta"**: la curada es chica pero confiable; OSM da cobertura global pero variable. Combinarlas vía un `queryPoint` único (GPS o ciudad principal del país) y sortear por distancia da algo útil para cualquier país. El locator oficial WPN siempre está disponible como fallback.
- **Reverse geocoding via Nominatim**: para convertir lat/lon → país sin claves de API ni listas hardcodeadas de bounding boxes. Proxeado por el backend (cache 24h + cert TLS corporativo).
- **Data de carta on-demand para stats/wishlist/mazos**: la DB sólo guarda `card_id + set_code` (no rareza/color/cmc/precio). Las vistas que necesitan esos campos los traen de Scryfall con `POST /cards/collection` batcheado de a 75, en vez de duplicar metadata en la DB (evita migraciones y backfill; la data viene siempre fresca). El costo es un fetch al abrir la vista.
- **Commit de sesión diferido (animación de login)**: `authenticate`/`registerAccount` validan credenciales pero **no** setean `isAuthenticated`; el commit (`commitSession`) ocurre recién al terminar la animación. Si no, el wrapper `GuestOnly` redirigía al instante y desmontaba la animación antes de verse.
- **Persistencia incremental + import bulk en mazos**: cada cambio de cantidad es un `PUT` optimista (sin botón "guardar"), pero importar una decklist usa **un solo** `POST /:id/import` transaccional en vez de N requests. La resolución de nombres reusa el endpoint `/collection` con identifiers `{name}` (Scryfall hace el match).

---

## Performance — buenas prácticas aplicadas

- `<link rel="preconnect">` a `api.scryfall.com` y `cards.scryfall.io` en `index.html`.
- Imágenes con `loading="lazy" decoding="async" srcSet sizes` para descargas adaptativas.
- `IntersectionObserver` para no instanciar `<img>` fuera de viewport.
- `React.memo` en `CardItem`, `CardGrid`, `SearchBar`, `Filters`, `SortControls`, `Pagination`, `ManaCost`, `CardModal`.
- `useFetch` con `AbortController` cancela requests obsoletos al cambiar filtros rápidamente.
- Chunk splitting de `react`/`react-router` en `vite.config.js`.

---

## Configuración VS Code

`.vscode/settings.json` ya incluye:
- `editor.formatOnSave`
- Asociación `*.css` → Tailwind
- Regex experimentales para `clsx`/`cn`
- ESLint validate para JS/JSX
- Exclusión de `node_modules` / `dist` del search

Extensiones recomendadas: **Tailwind CSS IntelliSense**, **Prettier**, **ESLint**.

---

## Roadmap

### ✅ Implementado en iteraciones recientes

- **Estadísticas de colección** (`/stats`) — dashboard con resumen + charts de curva/rareza/color/tipo/top sets.
- **Wishlist** (`/wishlist`) — lista de deseados con vista grilla/lista y auto-quitar al adquirir.
- **Construcción de mazos** (`/decks`) — editor con buscador, stats, validación de legalidad (constructed), **importar/exportar decklist** (MTGO/Moxfield/Arena) y **mazos competitivos de referencia** (arquetipos curados con cartas clave + "crear mazo base").
- **Exportar colección** (`/collection`) — descarga a CSV o JSON autocontenido, resolviendo la metadata de cada carta on-demand contra Scryfall.

### Candidatos pendientes

Respetan el stack actual — sin deps nuevas innecesarias, cliente siempre vía proxy `/api/*`.

**Rápidas, alto valor:**
- **Cartas vistas recientemente**: historial de las últimas N cartas abiertas en detalle (`localStorage`).
- **Buscador dentro de un set** en `CollectionSetPage` (filtrar por nombre/número sobre las cartas ya cargadas).

**Medianas:**
- **Extender mazos**: sideboard, formato Commander (singleton + 100 + comandante), "armar desde la colección".
- **Otras impresiones** de una carta + precios comparados (`prints_search_uri` de Scryfall).

**Pulido / UX:**
- Command palette de búsqueda global (Ctrl/Cmd+K).
- Skeletons/animaciones de entrada más consistentes entre páginas.
- PWA instalable + offline-first (ya hay caché en `localStorage`).

---

## Licencia y créditos

- Datos: [Scryfall](https://scryfall.com) — licenciados bajo [CC0](https://scryfall.com/docs/api).
- Magic: The Gathering es marca registrada de **Wizards of the Coast**. Este proyecto no está afiliado con WotC.
