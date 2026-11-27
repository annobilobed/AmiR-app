import { AppGate } from "@/components/app-gate";
import { BottomNav, SideNav } from "@/components/bottom-nav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SideNav />
      {/* Phones: one column. Tablets: a little wider. Desktops: beside the sidebar, up to 1040px. */}
      <main className="mx-auto max-w-lg px-5 pb-28 pt-4 md:max-w-2xl md:px-8 lg:ml-64 lg:max-w-none lg:px-12 lg:pb-14 lg:pt-10">
        <div className="lg:mx-auto lg:max-w-[1040px]">
          <AppGate>{children}</AppGate>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
