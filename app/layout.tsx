import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNLIVO — Find the right property. Find the right buyer.",
  description: "A more connected real estate ecosystem for buyers, owners and brokers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}