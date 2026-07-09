'use client';

import { LoginForm } from '@/components/auth/login-form';

/**
 * @fileOverview Halaman login dengan latar belakang foto terang sesuai permintaan.
 */
export default function LoginPage() {
  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4 relative overflow-hidden font-body"
      style={{ backgroundImage: "url('/cgi-bg.jpg')" }}
    >
       {/* Background is bright as requested, no dark overlay or blur */}
       <div className="relative z-10 w-full flex justify-center animate-in fade-in zoom-in duration-700">
          <LoginForm />
       </div>
    </div>
  );
}
