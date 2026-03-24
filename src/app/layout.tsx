// src/app/layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "KaliYUVA LMS",
    template: "%s | KaliYUVA LMS",
  },
  description: "A platform for project-based learning — connecting consultants and learners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
