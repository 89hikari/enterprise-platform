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
        <span className="text-gray-400 text-xs">▸</span>
        {editingName ? (
          <>
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              className="border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') rename.mutate(nameVal.trim());
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
            <button
              onClick={() => rename.mutate(nameVal.trim())}
              disabled={!nameVal.trim() || rename.isPending}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >Save</button>
            <button onClick={() => setEditingName(false)} className="text-xs text-gray-400">Cancel</button>
          </>
        ) : (
          <>
            <span
              className="text-sm text-gray-800 cursor-pointer hover:text-blue-600"
              onClick={() => { setNameVal(node.name); setEditingName(true); }}
            >
              {node.name}
            </span>
            <div className="hidden group-hover:flex items-center gap-2 ml-2">
              <button
                onClick={() => setAddingChild(true)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >+ Child</button>
              <button
                onClick={() => { if (confirm(`Delete "${node.name}"?`)) remove.mutate(); }}
                className="text-xs text-red-400 hover:text-red-600"
              >× Delete</button>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-500 ml-6 mb-1">{error}</p>}

      {addingChild && (
        <div className="ml-6 flex gap-2 mb-2">
          <input
            autoFocus
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Sub-department name"
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && childName.trim()) addChild.mutate(childName.trim());
              if (e.key === 'Escape') setAddingChild(false);
            }}
          />
          <button
            onClick={() => { if (childName.trim()) addChild.mutate(childName.trim()); }}
            disabled={!childName.trim() || addChild.isPending}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >Add</button>
          <button onClick={() => setAddingChild(false)} className="text-xs text-gray-400">Cancel</button>
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
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Departments</h2>
        <button
          onClick={() => setAddingRoot(true)}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          + Add department
        </button>
      </div>

      {addingRoot && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            placeholder="Department name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && rootName.trim()) addRoot.mutate(rootName.trim());
              if (e.key === 'Escape') setAddingRoot(false);
            }}
          />
          <button
            onClick={() => { if (rootName.trim()) addRoot.mutate(rootName.trim()); }}
            disabled={!rootName.trim() || addRoot.isPending}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >Add</button>
          <button onClick={() => setAddingRoot(false)} className="text-sm text-gray-400 hover:text-gray-600 px-2">Cancel</button>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {tree.length === 0 && !addingRoot && (
        <p className="text-gray-400 text-sm">No departments yet.</p>
      )}

      {tree.map((node) => (
        <DeptNodeRow key={node.id} node={node} token={token} onMutate={refresh} orgId={orgId} />
      ))}
    </div>
  );
}
