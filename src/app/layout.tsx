import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CICS — College Internal Communication System",
  description: "A private space for college students to post and talk freely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="antialiased bg-bg-primary text-text-primary min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
