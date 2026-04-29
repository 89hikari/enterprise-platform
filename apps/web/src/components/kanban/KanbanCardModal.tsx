'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { clsx } from 'clsx';
import type { KanbanCard, KanbanCardAssignee, KanbanSubtask, KanbanLabel } from '@enterprise/shared';
import type { BoardMember } from './KanbanBoardView';

interface Props {
  card: KanbanCard;
  boardId: string;
  boardMembers: BoardMember[];
  boardColumns: { id: string; name: string }[];
  token: string | undefined;
  onClose: () => void;
  onUpdated: () => void;
}

export function KanbanCardModal({ card, boardId, boardMembers, boardColumns, token, onClose, onUpdated }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.slice(0, 10) : '');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch full card detail (includes subtasks, assignees, labels, attachments)
  const { data: fullCard } = useQuery<KanbanCard>({
    queryKey: ['card', card.id],
    queryFn: () => api.get(`/kanban/cards/${card.id}`, token),
    initialData: card,
  });

  const updateCard = useMutation({
    mutationFn: (data: { title?: string; description?: string; dueDate?: string | null }) =>
      api.patch(`/kanban/cards/${card.id}`, data, token),
    onSuccess: () => { onUpdated(); qc.invalidateQueries({ queryKey: ['card', card.id] }); },
  });

  const createSubtask = useMutation({
    mutationFn: (title: string) =>
      api.post(`/kanban/cards/${card.id}/subtasks`, { title }, token),
    onSuccess: () => { onUpdated(); qc.invalidateQueries({ queryKey: ['card', card.id] }); },
  });

  const toggleSubtask = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      api.patch(`/kanban/subtasks/${id}`, { isCompleted }, token),
    onSuccess: () => { onUpdated(); qc.invalidateQueries({ queryKey: ['card', card.id] }); },
  });

  const deleteSubtask = useMutation({
    mutationFn: (id: string) => api.delete(`/kanban/subtasks/${id}`, token),
    onSuccess: () => { onUpdated(); qc.invalidateQueries({ queryKey: ['card', card.id] }); },
  });

  const setAssignees = useMutation({
    mutationFn: (assigneeIds: string[]) =>
      api.patch(`/kanban/cards/${card.id}/assignees`, { assigneeIds }, token),
    onSuccess: () => { onUpdated(); qc.invalidateQueries({ queryKey: ['card', card.id] }); },
  });

  const moveCard = useMutation({
    mutationFn: (toColumnId: string) =>
      api.patch(`/kanban/cards/${card.id}/move`, { toColumnId, newPosition: Date.now() }, token),
    onSuccess: () => { onUpdated(); onClose(); },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSaveTitle = () => {
    if (title.trim() && title !== card.title) {
      updateCard.mutate({ title: title.trim() });
    }
  };

  const handleSaveDescription = () => {
    if (description !== (card.description ?? '')) {
      updateCard.mutate({ description });
    }
  };

  const handleDueDateChange = (val: string) => {
    setDueDate(val);
    updateCard.mutate({ dueDate: val ? new Date(val).toISOString() : null });
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      createSubtask.mutate(newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  };

  const subtasks: KanbanSubtask[] = fullCard?.subtasks ?? [];
  const assignees: KanbanCardAssignee[] = fullCard?.assignees ?? [];
  const labels: KanbanLabel[] = fullCard?.labels ?? [];
  const completed = subtasks.filter((s) => s.isCompleted).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            className="flex-1 text-lg font-semibold text-gray-900 border-0 outline-none focus:ring-2 focus:ring-blue-400 rounded px-1 -mx-1"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Labels */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Due date */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24 shrink-0">Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className={clsx(
                'text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400',
                dueDate && new Date(dueDate) < new Date() ? 'text-red-500' : 'text-gray-700',
              )}
            />
            {dueDate && (
              <button
                onClick={() => handleDueDateChange('')}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Clear
              </button>
            )}
          </div>

          {/* Move to column */}
          {boardColumns.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-24 shrink-0">Move to</span>
              <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) moveCard.mutate(e.target.value); }}
                disabled={moveCard.isPending}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 bg-white"
              >
                <option value="" disabled>Select column…</option>
                {boardColumns
                  .filter((c) => c.id !== card.columnId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Assignees */}
          <div className="flex items-start gap-3">
            <span className="text-sm text-gray-500 w-24 shrink-0 pt-1">Assignees</span>
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-1">
                {assignees.length === 0 && !pickerOpen && (
                  <span className="text-sm text-gray-400">None</span>
                )}
                {assignees.map(({ user: u }) => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full pl-1.5 pr-1 py-0.5">
                    <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-800 shrink-0">
                      {u.firstName[0]}
                    </div>
                    <span className="text-xs text-gray-700">{u.firstName} {u.lastName}</span>
                    <button
                      onClick={() => {
                        const next = assignees.filter((a) => a.user.id !== u.id).map((a) => a.user.id);
                        setAssignees.mutate(next);
                      }}
                      className="text-gray-400 hover:text-red-500 ml-0.5 leading-none text-sm"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Picker */}
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setPickerOpen((o) => !o)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  + Assign
                </button>
                {pickerOpen && (
                  <div className="absolute left-0 top-6 z-10 bg-white border border-gray-200 rounded-xl shadow-lg w-56 py-1 max-h-52 overflow-y-auto">
                    {boardMembers.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400">No board members</p>
                    )}
                    {boardMembers.map(({ user: m }) => {
                      const isAssigned = assignees.some((a) => a.user.id === m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            const next = isAssigned
                              ? assignees.filter((a) => a.user.id !== m.id).map((a) => a.user.id)
                              : [...assignees.map((a) => a.user.id), m.id];
                            setAssignees.mutate(next);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                            {m.firstName[0]}
                          </div>
                          <span className="text-sm text-gray-800 flex-1">{m.firstName} {m.lastName}</span>
                          {isAssigned && (
                            <span className="text-blue-500 text-xs font-bold">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="Add a description…"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder:text-gray-400"
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                Subtasks
                {subtasks.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400">{completed}/{subtasks.length}</span>
                )}
              </p>
              {subtasks.length > 0 && (
                <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full transition-all"
                    style={{ width: `${(completed / subtasks.length) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={st.isCompleted}
                    onChange={(e) => toggleSubtask.mutate({ id: st.id, isCompleted: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  />
                  <span className={clsx('text-sm flex-1', st.isCompleted && 'line-through text-gray-400')}>
                    {st.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask.mutate(st.id)}
                    className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask */}
            <div className="flex gap-2 mt-2">
              <input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add subtask…"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                  if (e.key === 'Escape') setNewSubtaskTitle('');
                }}
              />
              <button
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {/* Attachments */}
          {(fullCard?.attachments?.length ?? 0) > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Attachments</p>
              <div className="space-y-1.5">
                {fullCard!.attachments!.map((att) => (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <span>📎</span>
                    <span className="truncate">{att.fileName}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {(att.fileSize / 1024).toFixed(0)} KB
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50">
          <p className="text-xs text-gray-400">
            Created {new Date(card.createdAt).toLocaleDateString()}
          </p>
          <button
            onClick={onClose}
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
