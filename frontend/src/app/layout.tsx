import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/toaster";
import PersistentDashboardContainer from "./components/layout/persistent-dashboard-container";

export const metadata = {
  title: "SLUGGER",
  description:
    "Discover advanced insights and data that redefine your understanding of the game.Developed by the Johns Hopkins Sports Analytics Research Group.",
  icons: [
    { rel: 'icon', url: '/alpb-logo.png' },
    { rel: 'apple-touch-icon', url: '/alpb-logo.png' },
    { rel: 'shortcut icon', url: '/favicon.ico' }
  ]
};

export const viewport = {
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <html lang="en">
        <body suppressHydrationWarning={true}>
          {/* 
           * PersistentDashboardContainer stays mounted across all routes
           * to preserve widget iframe state during navigation.
           * It shows/hides based on current route via CSS display property.
           * Requirements: 8.1
           */}
          <PersistentDashboardContainer />
          <main>{children}</main>
          <Toaster />
        </body>
      </html>
    </AuthProvider>
  );
}
