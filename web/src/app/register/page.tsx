import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4 relative"
      style={{ backgroundImage: "url('/cgi-bg.jpg')" }}
    >
       <div className="relative z-10 w-full flex justify-center">
          <RegisterForm />
       </div>
    </div>
  );
}
