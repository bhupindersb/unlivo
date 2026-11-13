import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PropertyEnquiryState from "../components/property-enquiry-state";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.unlivo.com"),
  title: {
    default: "UNLIVO | Find the Right Property. Find Your Match.",
    template: "%s | UNLIVO",
  },
  description:
    "Tell UNLIVO what property you need. Discover relevant properties and connect with buyers, owners and verified real estate brokers across India.",
  applicationName: "UNLIVO",
  openGraph: {
    type: "website",
    siteName: "UNLIVO",
    title: "UNLIVO | Find the Right Property. Find Your Match.",
    description:
      "Share your property requirement and connect with relevant properties and people across India.",
    url: "https://www.unlivo.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "UNLIVO | Find the Right Property. Find Your Match.",
    description:
      "Share your property requirement and connect with relevant properties and people across India.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={inter.className}><PropertyEnquiryState />{children}</body></html>;
}
