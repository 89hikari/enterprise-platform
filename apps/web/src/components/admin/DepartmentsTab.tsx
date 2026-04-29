'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface Dept {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  organizationId: string;
}

interface DeptNode extends Dept {
  children: DeptNode[];
}

function buildTree(flat: Dept[]): DeptNode[] {
  const map = new Map<string, DeptNode>();
  flat.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: DeptNode[] = [];
  map.forEach((node) => {
    if (node.parentDepartmentId && map.has(node.parentDepartmentId)) {
      map.get(node.parentDepartmentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

interface NodeProps {
  node: DeptNode;
  token: string | undefined;
  onMutate: () => void;
  orgId: string;
}

function DeptNodeRow({ node, token, onMutate, orgId }: NodeProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(node.name);
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [error, setError] = useState('');

  const rename = useMutation({
    mutationFn: (name: string) => api.patch(`/departments/${node.id}`, { name }, token),
    onSuccess: () => { onMutate(); setEditingName(false); },
    onError: (e: any) => setError(e.message ?? 'Error'),
  });

  const addChild = useMutation({
    mutationFn: (name: string) =>
      api.post('/departments', { name, organizationId: orgId, parentDepartmentId: node.id }, token),
    onSuccess: () => { onMutate(); setAddingChild(false); setChildName(''); },
    onError: (e: any) => setError(e.message ?? 'Error'),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/departments/${node.id}`, token),
    onSuccess: onMutate,
    onError: (e: any) => setError(e.message ?? 'Cannot delete — department may have members'),
  });

  return (
    <div className="ml-4">
      <div className="flex items-center gap-2 py-1 group">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>▸</span>
        {editingName ? (
          <>
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              className="terminal-input py-0.5 px-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') rename.mutate(nameVal.trim());
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
            <button
              onClick={() => rename.mutate(nameVal.trim())}
              disabled={!nameVal.trim() || rename.isPending}
              className="text-xs terminal-link"
            >save</button>
            <button onClick={() => setEditingName(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>cancel</button>
          </>
        ) : (
          <>
            <span
              className="text-sm cursor-pointer hover:opacity-70"
              onClick={() => { setNameVal(node.name); setEditingName(true); }}
            >
              {node.name}
            </span>
            <div className="hidden group-hover:flex items-center gap-2 ml-2">
              <button
                onClick={() => setAddingChild(true)}
                className="text-xs terminal-link"
              >+ child</button>
              <button
                onClick={() => { if (confirm(`Delete "${node.name}"?`)) remove.mutate(); }}
                className="text-xs hover:opacity-70"
                style={{ color: 'var(--danger)' }}
              >× delete</button>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-xs ml-6 mb-1" style={{ color: 'var(--danger)' }}>{error}</p>}

      {addingChild && (
        <div className="ml-6 flex gap-2 mb-2">
          <input
            autoFocus
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="sub-department name"
            className="terminal-input py-0.5 px-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && childName.trim()) addChild.mutate(childName.trim());
              if (e.key === 'Escape') setAddingChild(false);
            }}
          />
          <button
            onClick={() => { if (childName.trim()) addChild.mutate(childName.trim()); }}
            disabled={!childName.trim() || addChild.isPending}
            className="terminal-btn terminal-btn-primary text-xs py-0.5 px-2"
          >add</button>
          <button onClick={() => setAddingChild(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>cancel</button>
        </div>
      )}

      {node.children.map((child) => (
        <DeptNodeRow key={child.id} node={child} token={token} onMutate={onMutate} orgId={orgId} />
      ))}
    </div>
  );
}

export function DepartmentsTab({ token }: { token: string | undefined }) {
  const qc = useQueryClient();
  const [addingRoot, setAddingRoot] = useState(false);
  const [rootName, setRootName] = useState('');
  const [error, setError] = useState('');

  const { data: orgs } = useQuery<{ id: string }[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations', token),
    enabled: !!token,
  });
  const orgId = orgs?.[0]?.id ?? '';

  const { data: departments = [] } = useQuery<Dept[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments', token),
    enabled: !!token,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['departments'] });

  const addRoot = useMutation({
    mutationFn: (name: string) =>
      api.post('/departments', { name, organizationId: orgId }, token),
    onSuccess: () => { refresh(); setAddingRoot(false); setRootName(''); setError(''); },
    onError: (e: any) => setError(e.message ?? 'Error'),
  });

  const tree = buildTree(departments);

  return (
    <div
      className="p-5"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>departments</h2>
        <button
          onClick={() => setAddingRoot(true)}
          className="terminal-btn terminal-btn-primary text-xs"
        >
          <span>+</span>
          add
        </button>
      </div>

      {addingRoot && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            placeholder="department name"
            className="terminal-input flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && rootName.trim()) addRoot.mutate(rootName.trim());
              if (e.key === 'Escape') setAddingRoot(false);
            }}
          />
          <button
            onClick={() => { if (rootName.trim()) addRoot.mutate(rootName.trim()); }}
            disabled={!rootName.trim() || addRoot.isPending}
            className="terminal-btn terminal-btn-primary text-xs"
          >add</button>
          <button onClick={() => setAddingRoot(false)} className="terminal-btn text-xs">cancel</button>
        </div>
      )}
      {error && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}

      {tree.length === 0 && !addingRoot && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>no departments yet.</p>
      )}

      {tree.map((node) => (
        <DeptNodeRow key={node.id} node={node} token={token} onMutate={refresh} orgId={orgId} />
      ))}
    </div>
  );
}
