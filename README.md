# Documentación BaBel+
## 0. ¿BaBel+?
Babel+ es una herramienta para organizar y conectar información en forma de grafo de conocimiento: cada pieza de información se guarda como un "nodo" que se puede vincular con otros nodos relacionados, permitiendo construir mapas de conocimiento interconectados en lugar de listas planas o carpetas aisladas. Su diferencial es el uso de inteligencia artificial para acelerar ese proceso: cuando el usuario agrega un nuevo nodo, la herramienta analiza el contenido con un modelo de lenguaje (Llama 3.1 vía Groq), sugiere automáticamente su clasificación y detecta posibles relaciones con nodos ya existentes en el sistema, reduciendo el trabajo manual de organizar y etiquetar información. El resultado es un espacio pensado para quienes necesitan estructurar conocimiento complejo —notas de investigación, documentación de proyectos, bases de conocimiento personales— donde las conexiones entre ideas son tan importantes como las ideas mismas.

## 1. Patrón Arquitectónico Inferido

**Arquitectura por Capas (Layered Architecture) con variante API-First, empaquetada en Monorepo.**

```
┌──────────────────────────────────────────────────┐
│                  CLIENT TIER                      │
│  React SPA (Vite + react-router-dom)              │
│  packages/client                                  │
│    ├─ pages/    (Dashboard, NodeDetail, GraphView)│
│    ├─ components/ (Layout, Sidebar, SearchBar...) │
│    └─ api/client.ts  (capa de transporte HTTP)    │
├──────────────────────────────────────────────────┤
│                 API TIER                          │
│  Hono HTTP Server (TypeScript ESM)               │
│  packages/server                                  │
│    ├─ routes/     (controladores por recurso)     │
│    ├─ lib/        (servicios: AI, Config)         │
│    └─ db/         (acceso a datos: schema, ORM)   │
├──────────────────────────────────────────────────┤
│               DATA TIER                           │
│  PostgreSQL (Render) + Drizzle ORM (DAO)          │
│    ├─ nodes table                                 │
│    └─ relations table                             │
└──────────────────────────────────────────────────┘
                      │
              ┌───────▼───────┐
              │   Groq AI API │  (servicio externo)
              │ (llama-3.1-8b)│
              └───────────────┘
```

**Capas del servidor (orden de dependencia decreciente):**

| Capa | Ubicación | Responsabilidad |
|------|-----------|----------------|
| **Routes** (Controller) | `routes/*.ts` | Parseo HTTP, validación, serialización JSON, delegación |
| **Services** (Business Logic) | `lib/ai.ts` | Orquestación de lógica de dominio (clasificación IA) |
| **Data Access** (Persistence) | `db/index.ts` + `db/schema.ts` | ORM, consultas, migraciones, seeding |
| **Shared Kernel** | `packages/shared/src/types.ts` | Tipos compartidos entre server y cliente |

**React SPA** — Sigue el patrón **Pages + Components** (no hay Redux, estado local con hooks). El enrutador (`react-router-dom`) selecciona la página; cada página orquesta sus componentes y llama a la API mediante el módulo `api/client.ts`.

---

## 2. Flujo de Datos Principal (Petición → Persistencia)

### 2a. Flujo CRUD canónico (POST /api/nodes)

```
[Browser]                          [Hono Server]                    [PostgreSQL]
    │                                    │                              │
    │ 1. onSubmit()                      │                              │
    │ api.nodes.create(data)              │                              │
    │ ──► fetch('/api/nodes', POST)       │                              │
    │                                    │                              │
    │                        2. CORS middleware                         │
    │                        3. Router match ─► routes/nodes.ts         │
    │                                    │                              │
    │                        4. c.req.json() → CreateNodeInput          │
    │                        5. Validación (title, type, status...)     │
    │                        6. crypto.randomUUID() + new Date()        │
    │                                    │                              │
    │                        7. db.insert(nodes).values(node) ────────► │
    │                                    │                              │
    │                                    │◄── INSERT OK ────────────── │
    │                                    │                              │
    │    ◄── 201 + JSON(node) ──────────│                              │
    │                                    │                              │
```

Las validaciones ocurren **en la capa de ruta** (no en una capa de servicio separada), lo que indica que la lógica de negocio es liviana y reside directamente en los controladores. No existe una capa `Service` explícita para CRUD; esta emerge solo para la funcionalidad de IA.

### 2b. Flujo de IA con efecto secundario (POST /api/ai/smart-add)

```
[Client]         [routes/ai.ts]            [lib/ai.ts]               [Groq API]         [DB]
   │                   │                       │                        │                │
   │ POST /smart-add   │                       │                        │                │
   │ {text, typeHint}  │                       │                        │                │
   │──────────────────►│                       │                        │                │
   │                   │ 1. Valida input       │                        │                │
   │                   │ 2. classifyAndSuggest()─►                      │                │
   │                   │                       │                        │                │
   │                   │            3. SELECT title, type FROM nodes ────►─── list┐      │
   │                   │                       │                        │      │      │
   │                   │            4. Construye prompt con              │      │      │
   │                   │               nodos existentes + input          │      │      │
   │                   │                       │                        │      │      │
   │                   │            5. POST chat/completions ───────────►│      │      │
   │                   │                       │                        │      │      │
   │                   │                       │◄── JSON structure ─────│      │      │
   │                   │                       │  {node, relations}     │      │      │
   │                   │                       │                        │      │      │
   │                   │            6. INSERT node (DB) ───────────────────────────►  │
   │                   │            7. Por cada relation:                          │  │
   │                   │               SELECT node WHERE title match               │  │
   │                   │               INSERT relation ────────────────────────────►  │
   │                   │                       │                        │                │
   │ ◄─── 201 + {node, relations} ────────────│                        │                │
```

**Punto crítico:** La IA recibe la lista completa de títulos existentes para decidir relaciones. Esto escala O(n) en el prompt con cada nuevo nodo. Con ~20 nodos semilla es irrelevante; con miles, habrá que implementar búsqueda semántica (embedding) o recortar el contexto.

---

## 3. Dependencias Críticas del Sistema

### 3a. Dependencias de Infraestructura

| Dependencia | Rol | Alternativa / Riesgo |
|------------|-----|---------------------|
| **PostgreSQL** (Render) | Única fuente de verdad | Caída de Render deja el sistema inerte. Sin fallback ni caché. |
| **Groq API** (`llama-3.1-8b`) | Motor de clasificación IA | Sin esta, `/api/ai/*` falla; CRUD manual funciona. API key hardcodeada en `.env`. |
| **Node.js ≥18** (ESM) | Runtime del servidor | Soporte nativo de `tsx` depende de la versión. |

### 3b. Dependencias de Paquete (Producción)

| Paquete | Versión | Propósito | Nota |
|---------|---------|-----------|------|
| `hono` | ^4.7.0 | Framework HTTP | ~12KB, sin dependencias externas |
| `@hono/node-server` | ^1.13.0 | Adaptador Node.js para Hono | Reemplazable por `hono/node` nativo |
| `drizzle-orm` | ^0.40.0 | ORM / Query builder | Migraciones vía `drizzle-kit` |
| `pg` | ^8.13.0 | Driver PostgreSQL | Dependencia directa de Drizzle |
| `openai` | ^6.42.0 | SDK cliente OpenAI → Groq | Usado con `baseURL` apuntando a Groq |
| `dotenv` | ^17.4.2 | Carga de variables de entorno | Solo en desarrollo; en prod Render inyecta env vars |
| `tsx` | ^4.19.0 | Ejecutor TypeScript | **Crítica**: usada para `dev` y `start`; depende de Node.js ESM |

### 3c. Dependencias del Cliente

| Paquete | Propósito |
|---------|-----------|
| `react` / `react-dom` ^19.0.0 | UI framework |
| `react-router-dom` ^7.1.0 | Enrutamiento SPA |
| `@vitejs/plugin-react` | Compilación JSX |
| `vite` ^6.0.0 | Bundler y dev server con proxy `/api` |

### 3d. Acoplamientos Arquitectónicos

1. **shared → server/client**: El paquete `@babel-plus/shared` es la única fuente de tipos. Cualquier cambio en tipos requiere rebuild de ambos consumidores.
2. **routes → db directo**: Los controladores importan `db` y ejecutan queries sin capa intermedia. No hay repositorios ni servicios (excepto AI). Esto acopla la lógica HTTP al esquema de base de datos.
3. **Vite proxy → Hono**: En desarrollo, Vite redirige `/api/*` a `localhost:3000`. En producción, Hono sirve el `client/dist` estático. No hay API Gateway ni balanceador.
4. **Sin autenticación**: Aunque `plan.txt` y las variables `JWT_SECRET` existen, el código actual no implementa auth. Cualquier cliente con acceso a la URL puede leer/escribir toda la base de datos.
