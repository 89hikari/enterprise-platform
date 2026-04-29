'use client';

import { Chessboard } from 'react-chessboard';

interface Props {
  fen: string;
  orientation: 'white' | 'black';
  onMove: (from: string, to: string, promotion?: string) => boolean;
  isMyTurn: boolean;
}

export function ChessBoard({ fen, orientation, onMove, isMyTurn }: Props) {
  const onPieceDrop = (sourceSquare: string, targetSquare: string, piece: string): boolean => {
    if (!isMyTurn) return false;
    const isPromotion =
      piece[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1');
    return onMove(sourceSquare, targetSquare, isPromotion ? 'q' : undefined);
  };

  return (
    <div className="terminal-card overflow-hidden">
      <Chessboard
        position={fen}
        onPieceDrop={onPieceDrop}
        boardOrientation={orientation}
        arePiecesDraggable={isMyTurn}
      />
    </div>
  );
}
