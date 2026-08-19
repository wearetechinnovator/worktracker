'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PageShimmer from '@/components/PageShimmer';

export default function PunchGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Pages that don't require session check
  const publicPages = ['/login'];
  const isPublicPage = publicPages.includes(pathname);

  useEffect(() => {
    const checkAuthStatus = () => {
      if (isPublicPage) {
        setLoading(false);
        return;
      }

      const storedUser = localStorage.getItem('worktracker_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      setUser(JSON.parse(storedUser));
      setLoading(false);
    };

    checkAuthStatus();
  }, [pathname, router, isPublicPage]);

  // Show loading state
  if (loading) {
    return <PageShimmer variant="punch" />;
  }

  return <>{children}</>;
}
