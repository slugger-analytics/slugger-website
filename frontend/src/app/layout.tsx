import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/toaster";

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
          <main>{children}</main>
          <Toaster />
        </body>
      </html>
    </AuthProvider>
  );
}
