import { RegisterForm } from '@/components/auth/register-form';
import Image from 'next/image';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4">
                <Image src="/cgi.png" alt="CGI Logo" width={32} height={32} />
                <h1 className="text-3xl font-bold font-headline text-center text-foreground">
                    Asset_CGI
                </h1>
            </div>
            <p className="text-muted-foreground text-center">
                Buat akun baru untuk mulai mengelola aset.
            </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
