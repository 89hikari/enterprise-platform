'use client';

import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.isLoading) return;
    if (auth.isAuthenticated) {
      router.replace('/dashboard');
    } else if (auth.error) {
      console.error('OIDC sign-in error:', auth.error);
      router.replace('/');
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.error, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Signing in...</p>
    </div>
  );
}
