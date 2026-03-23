// src/app/page.tsx
// Root "/" is handled by middleware — this is a fallback
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
