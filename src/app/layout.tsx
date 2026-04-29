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
    <html lang="en">
      <body className="antialiased bg-[#0f0f0f] text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
