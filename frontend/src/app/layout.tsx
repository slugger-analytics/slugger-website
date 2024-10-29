import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
