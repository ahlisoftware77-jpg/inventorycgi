
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  title: 'Asset_CGI',
  description: 'Modern Asset Management for Your Company',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&family=Poppins:wght@400;500;600;700&family=Roboto+Mono:wght@400;700&family=Courier+Prime:wght@400;700&family=Spline+Sans+Mono:wght@400;700&family=Source+Code+Pro:wght@400;700&family=IBM+Plex+Mono:wght@400;700&family=Oswald:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen')}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
        <audio id="notification-sound" preload="auto">
            <source src="https://res.cloudinary.com/dbguqcgeq/video/upload/v1760512955/bell_ya7xg0.mp3" type="audio/mpeg" />
        </audio>
      </body>
    </html>
  );
}
