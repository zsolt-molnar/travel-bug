import { Suspense } from "react";
import RegisterClient from "./register-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <RegisterClient />
    </Suspense>
  );
}
