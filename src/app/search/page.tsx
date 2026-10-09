"use client";

import { Suspense } from "react";
import { SearchScreen } from "@/components/screens";

export default function Page() {
  return (
    <Suspense fallback={<p>Opening search…</p>}>
      <SearchScreen />
    </Suspense>
  );
}
