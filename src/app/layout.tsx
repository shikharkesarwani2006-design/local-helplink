
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { MobileNav } from '@/components/MobileNav';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { CriticalAlertBanner } from '@/components/notifications/CriticalAlertBanner';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground transition-colors duration-300">
        <FirebaseClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider>
              <div className="flex min-h-screen w-full overflow-x-hidden">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-w-0">
                  <Navbar />
                  <CriticalAlertBanner />
                  <main className="flex-1" role="main">
                    {children}
                  </main>
                </div>
              </div>
              <MobileNav />
              <Toaster />
            </SidebarProvider>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
