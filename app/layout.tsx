import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Customer Feedback",
  description: "Customer Feedback & Review Request System",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
