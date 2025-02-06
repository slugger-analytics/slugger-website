import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/toaster";

export const metadata = {
  title: "ALPB Analytics Platform widget registration example",
  description:
    "Sample form to register a widget for the ALPB Analytics Platform.",
};

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
