import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecondShelf · A good next read, already here",
  description: "A librarian-controlled discovery demo grounded in available stock, reviewed cultural matches and visible evidence.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
