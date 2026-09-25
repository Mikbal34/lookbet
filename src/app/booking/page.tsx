import { Suspense } from "react";
import { Odeme } from "@/components/odeme/odeme";

export default function OdemeSayfasi() {
  return (
    <Suspense>
      <Odeme />
    </Suspense>
  );
}
