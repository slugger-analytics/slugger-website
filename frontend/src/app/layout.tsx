import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/toaster";

export const metadata = {
  title: "ALPB Analytics Platform widget registration example",
  description:
    "Discover advanced insights and data that redefine your understanding of the game.Developed by the Johns Hopkins Sports Analytics Research Group.",
};

export const viewport= {
  initialScale: 1,
  width: 'device-width'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <html lang="en">
        <body>
          <main>{children}</main>
          <Toaster />
        </body>
      </html>
    </AuthProvider>
  );
}
