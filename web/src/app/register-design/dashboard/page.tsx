'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import DashboardDesignSummary from '@/components/dashboard-design-summary';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function RegisterDesignDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      if (user.role !== 'Admin' && !user.permissions?.canAccessRegisterDesign) {
        toast({ title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk mengakses Dashboard Register Design", variant: "destructive" });
        router.push('/');
      }
    }
  }, [user, loading, router, toast]);

  return (
    <DashboardLayout>
      <div className="w-full bg-slate-50/50 relative">
        <div className="pt-4 px-4 lg:px-6 -mb-2 relative z-10">
          <Button variant="outline" size="sm" onClick={() => router.push('/register-design')} className="bg-white shadow-sm border-slate-200 hover:bg-slate-100 h-8">
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Kembali
          </Button>
        </div>
        <DashboardDesignSummary />
      </div>
    </DashboardLayout>
  );
}
