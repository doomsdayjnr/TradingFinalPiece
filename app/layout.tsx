import "./globals.css";

export const metadata = {
  title: "Trading Final Piece | EA Access",
  description:
    "Access Trading Final Piece MT4 and MT5 Expert Advisors through verified XM partner-code registration."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
