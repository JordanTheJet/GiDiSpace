import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GiDiSpace - Your Digital Twin Space",
  description: "An AI-mediated knowledge network where your GiDi represents you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-900 text-white">
        {children}
      </body>
    </html>
  );
}
