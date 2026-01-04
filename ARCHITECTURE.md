# Arquitectura del Sistema de Chat

## Visión General

```mermaid
flowchart TB
    subgraph Cliente
        Home["/ Home"]
        Room["/room/[id] Sala"]
        Join["/join/[code] Invitación"]
        LS[(localStorage<br/>active-rooms)]
    end

    subgraph Servidor
        Proxy["proxy.ts<br/>Middleware"]
        API["/api/* Elysia"]
        JoinAPI["/api/join/[code]"]
    end

    subgraph Redis
        Meta["meta:{roomId}"]
        Invite["invite:{code}"]
        Messages["messages:{roomId}"]
    end

    Home -->|Crear sala| API
    Home -->|Restaurar token| API
    Room <-->|Intercepta| Proxy
    Proxy <--> Meta
    API <--> Redis
    Join --> JoinAPI
    JoinAPI <--> Redis
    Cliente <--> LS
```

---

## Estructuras de Datos en Redis

| Key                 | Tipo        | Campos                        | TTL    |
| ------------------- | ----------- | ----------------------------- | ------ |
| `meta:{roomId}`     | Hash        | `connected[]`, `createdAt`    | 10 min |
| `messages:{roomId}` | List        | Mensajes del chat             | 10 min |
| `invite:{code}`     | String/JSON | `roomId`, `createdBy`         | 5 min  |
| `invites:{roomId}`  | Set         | Códigos de invitación activos | 10 min |

---

## Flujo 1: Crear Sala (Creador)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant H as Home
    participant API as /api/room/create
    participant R as Redis
    participant P as proxy.ts
    participant Room as /room/[id]
    participant LS as localStorage

    U->>H: Click "CREAR SALA"
    H->>API: POST /api/room/create
    API->>R: hset meta:{roomId} connected=[], createdAt
    API->>R: expire meta:{roomId} 600s
    API-->>H: { roomId }
    H->>Room: redirect /room/{id}

    Note over P: Intercepta /room/*
    P->>R: hgetall meta:{roomId}
    R-->>P: { connected: [] }
    Note over P: Sin token válido, crea uno
    P->>R: hset connected=[token]
    P-->>Room: Redirect + Cookie x-auth-token

    Room->>API: GET /room/token
    API-->>Room: { token }
    Room->>LS: Guardar {roomId, token}
```

---

## Flujo 2: Invitar Usuario

```mermaid
sequenceDiagram
    actor C as Creador
    participant Room as /room/[id]
    participant API as /api/room/invite
    participant R as Redis

    C->>Room: Click "Invitar"
    Room->>API: POST /api/room/invite
    API->>R: set invite:{CODE} {roomId, createdBy}
    API->>R: sadd invites:{roomId} CODE
    API-->>Room: { code: "ABC123XY" }
    Room->>Room: Copiar link /join/ABC123XY
    Note over C: Comparte link por WhatsApp, etc.
```

---

## Flujo 3: Unirse con Invitación

```mermaid
sequenceDiagram
    actor I as Invitado
    participant J as /join/[code]
    participant JB as JoinButton
    participant API as /api/join/[code]
    participant R as Redis
    participant Room as /room/[id]
    participant LS as localStorage

    I->>J: Abre link /join/ABC123XY
    J->>R: Verificar invite:{code}
    R-->>J: { roomId, createdBy }
    J-->>I: Mostrar página con botón

    I->>JB: Click "UNIRSE"
    JB->>API: POST /api/join/ABC123XY
    API->>R: get invite:{code}
    API->>R: hgetall meta:{roomId}
    Note over API: Verificar sala existe y < 2 users
    API->>R: del invite:{code}
    API->>R: srem invites:{roomId} code
    API->>R: hset connected=[..., token]
    API-->>JB: { roomId, token } + Cookie

    JB->>LS: Guardar {roomId, token}
    JB->>Room: redirect /room/{id}

    Note over Room: Cookie ya está establecida
    Note over Room: Proxy valida token ✓
```

---

## Flujo 4: Volver a Entrar (Salas Activas)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant H as Home
    participant LS as localStorage
    participant API as /api/room/restore
    participant R as Redis
    participant Room as /room/[id]
    participant P as proxy.ts

    U->>H: Visita /
    H->>LS: Leer active-rooms
    LS-->>H: [{roomId, token}, ...]
    H-->>U: Mostrar "Salas activas"

    U->>H: Click "entrar"
    H->>API: POST /room/restore {roomId, token}
    API->>R: hgetall meta:{roomId}
    R-->>API: { connected: [token, ...] }
    Note over API: Verificar token en connected
    API-->>H: { success } + Cookie x-auth-token

    H->>Room: redirect /room/{id}
    Note over P: Cookie válida ✓
    P-->>Room: NextResponse.next()
```

---

## Flujo 5: Destruir Sala

```mermaid
sequenceDiagram
    actor U as Usuario
    participant Room as /room/[id]
    participant API as /api/room
    participant R as Redis
    participant RT as Realtime
    participant LS as localStorage

    U->>Room: Click "DESTRUIR"
    Room->>API: DELETE /api/room?roomId=X
    API->>RT: emit "chat.destroy"
    API->>R: smembers invites:{roomId}
    R-->>API: [code1, code2, ...]
    API->>R: del meta:{roomId}
    API->>R: del messages:{roomId}
    API->>R: del invites:{roomId}
    API->>R: del invite:{code1}, invite:{code2}...
    API-->>Room: OK

    Room->>LS: removeRoom(roomId)
    Room->>Room: redirect /?destroyed=true
```

---

## Middleware Proxy (proxy.ts)

```mermaid
flowchart TD
    A[Request /room/ID] --> B{Sala existe?}
    B -->|No| C[Redirect /?error=room-not-found]
    B -->|Sí| D{Token en cookie?}
    D -->|Sí| E{Token en connected?}
    E -->|Sí| F[NextResponse.next ✓]
    E -->|No| G{connected < 2?}
    D -->|No| G
    G -->|No| H[Redirect /?error=room-is-full]
    G -->|Sí| I[Crear nuevo token]
    I --> J[Agregar a connected]
    J --> K[Redirect + Set Cookie]
```

---

## Autenticación (auth.ts)

```mermaid
flowchart TD
    A[Request API] --> B{roomId en query?}
    B -->|No| C[401 Unauthorized]
    B -->|Sí| D{Cookie x-auth-token?}
    D -->|No| C
    D -->|Sí| E[Leer meta:{roomId}]
    E --> F{token en connected?}
    F -->|No| C
    F -->|Sí| G[Continuar ✓<br/>auth: {roomId, token, connected}]
```

---

## localStorage: active-rooms

```typescript
interface ActiveRoom {
  roomId: string; // ID de la sala
  token: string; // Token de autenticación
  joinedAt: number; // Timestamp de cuando se unió
}

// Ejemplo
[
  { roomId: "abc123", token: "xyz789", joinedAt: 1704307200000 },
  { roomId: "def456", token: "uvw321", joinedAt: 1704307500000 },
];
```

---

## Seguridad

| Aspecto            | Implementación                                  |
| ------------------ | ----------------------------------------------- |
| Tokens             | `nanoid()` - 21 chars, ~126 bits entropía       |
| Cookie             | `httpOnly`, `secure` (prod), `sameSite: strict` |
| Códigos invitación | 8 chars, un solo uso, expiran en 5 min          |
| Salas              | Máximo 2 usuarios, expiran en 10 min            |
| localStorage       | Tokens guardados para rejoin                    |

---

## Roadmap de Mejoras

### Fase 1: Entendimiento profundo

- [ ] Correr la app localmente y probar todos los flujos
- [ ] Monitorear Redis en tiempo real durante operaciones
- [ ] Documentar tecnologías nuevas (Elysia, Upstash Realtime, React Query)

### Fase 2: README.md profesional

- [ ] Descripción del proyecto
- [ ] Tecnologías y justificación de elección
- [ ] Diagrama de arquitectura (reutilizar de ARCHITECTURE.md)
- [ ] Instrucciones de setup
- [ ] Variables de entorno necesarias
- [ ] Screenshots/GIFs del funcionamiento

### Fase 3: Refactorizaciones progresivas

| Orden | Refactor                    | Descripción                                             | Estado |
| ----- | --------------------------- | ------------------------------------------------------- | ------ |
| 1     | **DAL (Data Access Layer)** | Extraer acceso a Redis de `route.ts` a `src/lib/dal/`   | ⬜     |
| 2     | **Tipos centralizados**     | Crear `src/types/` con interfaces Room, Message, Invite | ⬜     |
| 3     | **Error handling**          | Cambiar `throw new Error()` por errores tipados         | ⬜     |
| 4     | **Constantes extraídas**    | TTLs y configuración en un solo lugar                   | ⬜     |
| 5     | **Tests**                   | Unit tests para DAL, integration tests para API         | ⬜     |

### Estructura propuesta del DAL

```
src/lib/dal/
├── room.dal.ts      # create, getMeta, addConnected, destroy
├── message.dal.ts   # create, getAll, deleteByRoom
├── invite.dal.ts    # create, get, delete, getByRoom
└── index.ts         # re-exports
```

```typescript
// Ejemplo: src/lib/dal/room.dal.ts
export const roomDal = {
  async create(roomId: string): Promise<void> {
    /* ... */
  },
  async getMeta(roomId: string): Promise<RoomMeta | null> {
    /* ... */
  },
  async addConnected(roomId: string, token: string): Promise<void> {
    /* ... */
  },
  async isConnected(roomId: string, token: string): Promise<boolean> {
    /* ... */
  },
  async destroy(roomId: string): Promise<void> {
    /* ... */
  },
};
```

### Beneficios del DAL

- **Testeable**: Se puede mockear para unit tests sin Redis
- **Desacoplado**: Cambiar storage sin modificar rutas
- **Legible**: Handlers de API más limpios y declarativos
- **Mantenible**: Lógica de datos centralizada

### Fase 4: Documentación continua

- [ ] Documentar decisiones de diseño en commits
- [ ] Actualizar ARCHITECTURE.md con cada cambio de flujo
- [ ] Agregar sección de decisiones técnicas en README
