'use client';

import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
  DragOverlay, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { KanbanCardModal } from './KanbanCardModal';
import { clsx } from 'clsx';
import type { KanbanBoard, KanbanCard, KanbanCardAssignee, KanbanColumn } from '@enterprise/shared';

export interface BoardMember {
  userId: string;
  role: string;
  user: { id: string; firstName: string; lastName: string; photoUrl: string | null };
}

interface Props {
  board: KanbanBoard & {
    columns: (KanbanColumn & { cards: KanbanCard[] })[];
    members?: BoardMember[];
  };
  token: string | undefined;
}

function CardItem({ card, onClick }: { card: KanbanCard; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'terminal-card border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all select-none',
        isDragging && 'opacity-40',
      )}
    >
      <p className="text-sm font-medium text-gray-900 leading-snug">{card.title}</p>
      {card.dueDate && (
        <p className={clsx(
          'text-xs mt-1.5',
          new Date(card.dueDate) < new Date() ? 'text-red-500' : 'text-gray-400',
        )}>
          📅 {new Date(card.dueDate).toLocaleDateString()}
        </p>
      )}
      {(card.assignees?.length ?? 0) > 0 && (
        <div className="flex -space-x-1 mt-2">
          {card.assignees?.slice(0, 4).map((a: KanbanCardAssignee) => (
            <div key={a.user.id} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs text-blue-700 font-bold">
              {a.user.firstName[0]}
            </div>
          ))}
        </div>
      )}
      {(card.subtasks?.length ?? 0) > 0 && (
        <p className="text-xs text-gray-400 mt-1.5">
          ☑ {card.subtasks?.filter((s: any) => s.isCompleted).length}/{card.subtasks?.length}
        </p>
      )}
    </div>
  );
}

function DroppableArea({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex-1 overflow-y-auto space-y-2 min-h-[4rem] rounded-lg transition-colors',
        isOver && 'bg-blue-100',
      )}
    >
      {children}
    </div>
  );
}

function ColumnHeader({ column, onAddCard }: { column: KanbanColumn; onAddCard: () => void }) {
  return (
    <div
      className="flex items-center justify-between mb-2 px-1 terminal-card"
      style={{ borderTop: `3px solid ${column.color ?? '#94a3b8'}` }}
    >
      <span className="font-semibold text-gray-700 text-sm pt-1">{column.name}</span>
      <button
        onClick={onAddCard}
        className="text-gray-400 hover:text-blue-600 text-lg leading-none pt-1"
        title="Add card"
      >
        +
      </button>
    </div>
  );
}

export function KanbanBoardView({ board, token }: Props) {
  const qc = useQueryClient();
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const moveCard = useMutation({
    mutationFn: (data: { cardId: string; toColumnId: string; newPosition: number }) =>
      api.patch(`/kanban/cards/${data.cardId}/move`, { toColumnId: data.toColumnId, newPosition: data.newPosition }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', board.id] }),
  });

  const createCard = useMutation({
    mutationFn: (data: { columnId: string; title: string }) =>
      api.post(`/kanban/columns/${data.columnId}/cards`, { title: data.title }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', board.id] });
      setAddingToColumn(null);
      setNewCardTitle('');
    },
  });

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (active.data.current?.type === 'card') {
      setActiveCard(active.data.current.card);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveCard(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const sourceCard = board.columns.flatMap((c) => c.cards ?? []).find((c) => c.id === activeId);
    if (!sourceCard) return;

    let targetColumnId: string | null = null;
    let newPosition = 1000;

    for (const col of board.columns) {
      // Dropped directly onto a column's droppable area
      if (col.id === overId) {
        targetColumnId = col.id;
        const otherCards = col.cards.filter((c) => c.id !== activeId);
        const lastCard = otherCards[otherCards.length - 1];
        newPosition = (lastCard?.position ?? 0) + 1000;
        break;
      }
      // Dropped onto another card
      const cardIdx = col.cards.findIndex((c) => c.id === overId);
      if (cardIdx !== -1) {
        targetColumnId = col.id;
        const before = col.cards[cardIdx - 1]?.position ?? 0;
        const after = col.cards[cardIdx].position;
        newPosition = (before + after) / 2;
        break;
      }
    }

    if (!targetColumnId) return;

    moveCard.mutate({ cardId: activeId, toColumnId: targetColumnId, newPosition });
  };

  const columnIds = board.columns.map((c) => c.id);

  return (
    <div className="flex flex-col h-full">
        {/* Board header */}
        <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
          <h1 className="text-xl font-bold terminal-heading terminal-cursor">{board.name}</h1>
        </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full items-start">
            {board.columns.map((col) => (
              <div key={col.id} className="w-72 shrink-0 terminal-card p-3 flex flex-col max-h-full">
                <ColumnHeader
                  column={col}
                  onAddCard={() => setAddingToColumn(col.id)}
                />

                <DroppableArea id={col.id}>
                  <SortableContext items={(col.cards ?? []).map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {(col.cards ?? []).map((card) => (
                      <CardItem
                        key={card.id}
                        card={card}
                        onClick={() => setSelectedCard(card)}
                      />
                    ))}
                  </SortableContext>
                </DroppableArea>

                {/* Quick-add card */}
                {addingToColumn === col.id ? (
                  <div className="mt-2">
              <textarea
                autoFocus
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Card title..."
                rows={2}
                className="w-full terminal-input resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newCardTitle.trim()) createCard.mutate({ columnId: col.id, title: newCardTitle.trim() });
                  }
                  if (e.key === 'Escape') setAddingToColumn(null);
                }}
              />
                    <div className="flex gap-2 mt-1.5">
                      <button
                        onClick={() => { if (newCardTitle.trim()) createCard.mutate({ columnId: col.id, title: newCardTitle.trim() }); }}
                        disabled={!newCardTitle.trim() || createCard.isPending}
                        className="terminal-btn terminal-btn-primary text-xs px-3 py-1.5"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setAddingToColumn(null)}
                        className="terminal-btn text-xs px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToColumn(col.id)}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600 text-left px-1 py-1"
                  >
                    + Add card
                  </button>
                )}
              </div>
            ))}
          </div>

           <DragOverlay>
             {activeCard && (
               <div className="terminal-card border-2 border-blue-400 p-3 w-72 opacity-90">
                 <p className="text-sm font-medium text-gray-900">{activeCard.title}</p>
               </div>
             )}
           </DragOverlay>
        </DndContext>
      </div>

      {/* Card modal */}
      {selectedCard && (
        <KanbanCardModal
          card={selectedCard}
          boardId={board.id}
          boardMembers={board.members ?? []}
          boardColumns={board.columns.map((c) => ({ id: c.id, name: c.name }))}
          token={token}
          onClose={() => setSelectedCard(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ['board', board.id] })}
        />
      )}
    </div>
  );
}
