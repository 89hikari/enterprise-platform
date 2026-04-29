'use client';

import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.isLoading) return;
    if (auth.isAuthenticated) {
      router.replace('/dashboard');
    } else {
      auth.signinRedirect();
    }
  }, [auth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
