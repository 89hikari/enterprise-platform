-- CreateEnum
CREATE TYPE "ChessRoomStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "ChessResult" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW');

-- CreateEnum
CREATE TYPE "ChessEndReason" AS ENUM ('CHECKMATE', 'STALEMATE', 'TIMEOUT', 'RESIGN', 'DRAW_AGREEMENT', 'DISCONNECT', 'INSUFFICIENT_MATERIAL', 'THREEFOLD_REPETITION', 'FIFTY_MOVE_RULE');

-- CreateTable
CREATE TABLE "chess_rooms" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" "ChessRoomStatus" NOT NULL DEFAULT 'WAITING',
    "timeControl" INTEGER,
    "whiteId" TEXT,
    "blackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chess_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chess_games" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "whiteId" TEXT NOT NULL,
    "blackId" TEXT NOT NULL,
    "result" "ChessResult" NOT NULL,
    "endReason" "ChessEndReason" NOT NULL,
    "whiteEloChange" INTEGER NOT NULL,
    "blackEloChange" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chess_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chess_players" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "elo" INTEGER NOT NULL DEFAULT 1200,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chess_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chess_games_roomId_key" ON "chess_games"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "chess_players_userId_key" ON "chess_players"("userId");

-- AddForeignKey
ALTER TABLE "chess_rooms" ADD CONSTRAINT "chess_rooms_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chess_rooms" ADD CONSTRAINT "chess_rooms_whiteId_fkey" FOREIGN KEY ("whiteId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chess_rooms" ADD CONSTRAINT "chess_rooms_blackId_fkey" FOREIGN KEY ("blackId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chess_games" ADD CONSTRAINT "chess_games_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chess_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chess_games" ADD CONSTRAINT "chess_games_whiteId_fkey" FOREIGN KEY ("whiteId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chess_games" ADD CONSTRAINT "chess_games_blackId_fkey" FOREIGN KEY ("blackId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chess_players" ADD CONSTRAINT "chess_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
