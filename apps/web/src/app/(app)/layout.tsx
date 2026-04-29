'use client';

import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/shared/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      auth.signinRedirect();
    }
  }, [auth, router]);

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!auth.isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
