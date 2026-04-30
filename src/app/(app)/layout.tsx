'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { createClient } from '@/lib/supabase';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const guardRoutes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_first_login')
        .eq('id', user.id)
        .single();

      if (profile?.is_first_login) {
        router.replace('/set-password');
        return;
      }

      setChecking(false);
    };

    guardRoutes();
  }, [router, supabase]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Sidebar />
      <main className="md:ml-60 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
