import { Suspense } from "react";
import { StoreApp } from "@/components/StoreApp";

// StoreApp reads the URL via useSearchParams, so it must sit under a Suspense
// boundary — otherwise the static prerender of this route fails the build with
// "Missing Suspense boundary with useSearchParams".
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#e9e8e6]" />}>
      <StoreApp />
    </Suspense>
  );
}
