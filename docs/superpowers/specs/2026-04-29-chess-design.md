# Chess Feature Design

## Goal

Add a real-time multiplayer chess section to the enterprise platform where users can create rooms, challenge colleagues, play chess with live move synchronisation, and compete on an ELO leaderboard.

## Architecture

The chess feature follows the existing NestJS module pattern (same as `ChatModule` and `KanbanModule`):

- `ChessModule` with `ChessGateway` (Socket.IO `/chess` namespace), `ChessService` (business logic + in-memory game state), and `ChessController` (REST for initial page load)
- Active game state stored in a `Map<roomId, ActiveGame>` inside `ChessService` — never written to the DB until the game ends
- `chess.js` npm package validates all moves server-side
- PostgreSQL/Prisma stores rooms, results, and ELO ratings
- Frontend adds `(app)/chess/` pages and a `useChess` hook following the same pattern as `useChat`

## Data Model

### Prisma Models

```prisma
model ChessRoom {
  id          String          @id @default(uuid())
  name        String
  creatorId   String
  creator     User            @relation("chess_room_creator", fields: [creatorId], references: [id])
  status      ChessRoomStatus @default(WAITING)
  timeControl Int?            // null = unlimited; otherwise seconds per player
  whiteId     String?
  blackId     String?
  white       User?           @relation("chess_white", fields: [whiteId], references: [id])
  black       User?           @relation("chess_black", fields: [blackId], references: [id])
  game        ChessGame?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@map("chess_rooms")
}

enum ChessRoomStatus {
  WAITING
  ACTIVE
  FINISHED
}

model ChessGame {
  id             String         @id @default(uuid())
  roomId         String         @unique
  room           ChessRoom      @relation(fields: [roomId], references: [id])
  whiteId        String
  blackId        String
  white          User           @relation("chess_white_games", fields: [whiteId], references: [id])
  black          User           @relation("chess_black_games", fields: [blackId], references: [id])
  result         ChessResult
  endReason      ChessEndReason
  whiteEloChange Int
  blackEloChange Int
  createdAt      DateTime       @default(now())

  @@map("chess_games")
}

enum ChessResult {
  WHITE_WIN
  BLACK_WIN
  DRAW
}

enum ChessEndReason {
  CHECKMATE
  STALEMATE
  TIMEOUT
  RESIGN
  DRAW_AGREEMENT
  DISCONNECT
  INSUFFICIENT_MATERIAL
  THREEFOLD_REPETITION
  FIFTY_MOVE_RULE
}

model ChessPlayer {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  elo         Int      @default(1200)
  wins        Int      @default(0)
  losses      Int      @default(0)
  draws       Int      @default(0)
  gamesPlayed Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("chess_players")
}
```

### In-Memory Active Game State

```ts
interface ActiveGame {
  roomId: string;
  chess: Chess;                          // chess.js instance
  whiteId: string;
  blackId: string;
  whiteTimeMs: number;                   // remaining ms; Infinity if no time control
  blackTimeMs: number;
  lastMoveAt: number;                    // Date.now() at last move
  turn: 'w' | 'b';
  disconnectTimers: Map<string, NodeJS.Timeout>; // userId → grace timer
  drawOfferedBy?: string;                // userId or undefined
}
```

## WebSocket Namespace: `/chess`

Authentication: same JWT verification via Keycloak JWKS as `/chat` and `/kanban`.

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `create_room` | `{ name: string, timeControl: number \| null }` | Create a WAITING room |
| `join_room` | `{ roomId: string }` | Join as second player (Black); starts the game. Room creator is always White. |
| `make_move` | `{ roomId: string, from: string, to: string, promotion?: string }` | Submit a move |
| `offer_draw` | `{ roomId: string }` | Offer a draw |
| `respond_draw` | `{ roomId: string, accept: boolean }` | Accept or decline a draw offer |
| `resign` | `{ roomId: string }` | Resign the game |
| `leave_room` | `{ roomId: string }` | Cancel a WAITING room (creator only) |

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `room_list` | `RoomSummary[]` | Full room list broadcast on any change (WAITING and ACTIVE rooms only; FINISHED rooms are excluded) |
| `game_started` | `{ fen, white: UserSummary, black: UserSummary, timeControl: number \| null }` | Sent to both players when game begins |
| `move_made` | `{ fen, move: { from, to, san }, turn, whiteTimeMs, blackTimeMs }` | Broadcast after valid move |
| `invalid_move` | `{ reason: string }` | Only to the player who sent the illegal move |
| `draw_offered` | `{ by: string }` | Notify opponent of draw offer |
| `draw_declined` | — | Draw offer was declined |
| `game_over` | `{ result, reason, whiteElo, blackElo, whiteEloChange, blackEloChange }` | Game ended |
| `opponent_disconnected` | `{ gracePeriodMs: 30000 }` | Notify remaining player |
| `opponent_reconnected` | — | Grace timer cancelled; game continues |
| `error` | `{ message: string }` | Generic error (room full, not your turn, etc.) |

## REST API

| Method | Path | Description |
|---|---|---|
| `GET` | `/chess/rooms` | Room list with creator info (initial page load) |
| `GET` | `/chess/leaderboard` | Top 50 players by ELO with rank, wins, losses, draws |

Both endpoints require JWT auth (same guard as all other controllers).

## Chess Logic

On room creation, `whiteId` is set to `creatorId` immediately. `blackId` is null until the second player joins, at which point the game starts.

**Library:** `chess.js` (npm `chess.js`) installed in `apps/api`.

**Move validation:**
```ts
const result = game.chess.move({ from, to, promotion });
if (result === null) {
  // illegal move — emit invalid_move to sender only
  return;
}
```

**Game-end detection** (checked after every valid move):
- `chess.isCheckmate()` → winner is the player who just moved
- `chess.isStalemate()` → DRAW / STALEMATE
- `chess.isInsufficientMaterial()` → DRAW / INSUFFICIENT_MATERIAL
- `chess.isThreefoldRepetition()` → DRAW / THREEFOLD_REPETITION
- `chess.isDraw()` (includes 50-move rule) → DRAW / FIFTY_MOVE_RULE

## ELO Rating System

**K-factor:**
- ELO < 2100 → K = 32
- ELO 2100–2400 → K = 24
- ELO > 2400 → K = 16

**Formula:**
```
expected = 1 / (1 + 10^((opponentElo - myElo) / 400))
newElo   = currentElo + K × (score - expected)
```
Where `score` = 1 (win), 0.5 (draw), 0 (loss).

**Floor:** ELO cannot drop below 100.

**On game end:** upsert both players' `chess_players` records (create with ELO 1200 if first game, update otherwise), calculate new ELO, create `chess_game` record with `whiteEloChange` and `blackEloChange`, update room status to FINISHED.

## Clock System

- Clocks are managed server-side; no client-trusted timing.
- On game start: `whiteTimeMs = blackTimeMs = timeControl * 1000` (or `Infinity` if unlimited).
- `lastMoveAt = Date.now()` set on game start and after each valid move.
- On each valid move: deduct `Date.now() - lastMoveAt` from the moving player's clock before applying it.
- If `whiteTimeMs <= 0` or `blackTimeMs <= 0` after deduction → end game with `TIMEOUT` before broadcasting.
- Clock values included in every `move_made` broadcast so clients stay in sync without their own timers.
- Client displays a countdown UI interpolated from the last received clock values.

## Disconnect Handling

- On `disconnect` event for a socket in an active game:
  - Start a 30-second `setTimeout`, store it in `ActiveGame.disconnectTimers.set(userId, timer)`.
  - Emit `opponent_disconnected { gracePeriodMs: 30000 }` to the remaining player.
- On reconnect (`join_room` with an existing active `roomId`):
  - Clear the grace timer: `clearTimeout(disconnectTimers.get(userId))`.
  - Emit `opponent_reconnected` to the other player.
  - Emit `game_started` again to the reconnecting player with current FEN and remaining clock values (not the original starting values) so they restore board state accurately.
- If grace timer fires: end game, opponent wins (`DISCONNECT`).

## Frontend

### Pages

| Route | Component | Description |
|---|---|---|
| `(app)/chess/page.tsx` | `ChessLobby` | Tabs: Rooms \| Leaderboard. Room list auto-refreshes via `room_list` WS event. |
| `(app)/chess/[roomId]/page.tsx` | `ChessRoom` | Board, clocks, controls. Navigates back to lobby on game over. |

### Components (`components/chess/`)

| Component | Responsibility |
|---|---|
| `ChessBoard.tsx` | Renders 8×8 board from FEN, handles square click/drag to compose moves |
| `ChessClock.tsx` | Displays countdown, interpolates from last server-sent value |
| `RoomCard.tsx` | Single room in the lobby list (name, creator, time control, status, join button) |
| `CreateRoomModal.tsx` | Form: room name + time control picker (1 min / 5 min / 10 min / unlimited) |
| `Leaderboard.tsx` | Ranked table of top 50 players |
| `GameOverModal.tsx` | Result overlay: winner, reason, ELO change for both players |
| `DrawOfferBanner.tsx` | Banner shown to the player who received a draw offer (Accept / Decline) |

### Hook: `hooks/useChess.ts`

Manages the `/chess` Socket.IO namespace lifecycle:
- Connects on mount, disconnects on unmount
- Subscribes to `room_list`, `game_started`, `move_made`, `game_over`, `draw_offered`, `opponent_disconnected`, `opponent_reconnected`
- Exposes `createRoom`, `joinRoom`, `makeMove`, `offerDraw`, `respondDraw`, `resign`, `leaveRoom` functions
- Stores current game state in local React state (fen, turn, clocks, drawOffer)

### Sidebar Navigation

Add a chess entry (♟ icon, label "Chess") to the existing app sidebar, pointing to `/chess`.

## Shared Types (`packages/shared/src/types/index.ts`)

Add:
```ts
export interface ChessRoomSummary {
  id: string;
  name: string;
  creator: { id: string; firstName: string; lastName: string };
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  timeControl: number | null;
}

export interface ChessPlayerRank {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}
```

## Testing

- Unit tests for ELO calculation function (edge cases: both low/high K-factors, floor at 100)
- Unit tests for clock deduction logic (timeout detection, unlimited games)
- Integration tests for WebSocket events: move validation, game-end detection, disconnect grace period
- E2E: create room → join → make moves → checkmate → verify ELO updated
