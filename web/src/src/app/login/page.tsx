import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-white">
            <div className="flex items-center gap-2 mb-4">
                <Image src="/cgi.png" alt="CGI Logo" width={32} height={32} />
                <h1 className="text-3xl font-bold font-headline text-center">
                    Asset_CGI
                </h1>
            </div>
            <p className="text-center">
                Silakan masuk untuk mengelola aset perusahaan Anda.
            </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
