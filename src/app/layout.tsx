import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { MobileNav } from '@/components/MobileNav';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Local HelpLink | Hyperlocal Emergency & Skill Exchange',
  description: 'Connect with your local community for emergency help and skill exchange.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        <FirebaseClientProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <Navbar />
                <main className="flex-1">
                  {children}
                </main>
              </div>
            </div>
            <MobileNav />
            <Toaster />
          </SidebarProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
