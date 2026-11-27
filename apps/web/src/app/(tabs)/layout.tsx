import { AppGate } from "@/components/app-gate";
import { BottomNav } from "@/components/bottom-nav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-lg px-5 pb-28 pt-4">
        <AppGate>{children}</AppGate>
      </main>
      <BottomNav />
    </>
  );
}
