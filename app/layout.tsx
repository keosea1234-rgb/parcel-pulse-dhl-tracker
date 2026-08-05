import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parcel Pulse | DHL Tracking Dashboard",
  description: "A focused single-user DHL shipment tracking dashboard.",
  openGraph: {
    title: "Parcel Pulse | DHL Tracking Dashboard",
    description: "Every shipment, clear at a glance.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parcel Pulse | DHL Tracking Dashboard",
    description: "Every shipment, clear at a glance.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
