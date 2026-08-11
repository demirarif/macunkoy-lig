import { requireManager } from "@/lib/auth/current";
import { ensureTimeline } from "@/lib/services/gameweek";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Salı 23:00 geçtiyse kilidi burada atıyoruz. Cron'a gerek yok:
  // o saatten sonra siteye ilk giren kişi kilidi tetikliyor ve kimse
  // son dakika kadro değiştiremiyor.
  await ensureTimeline();
  const { manager, player } = await requireManager();

  return (
    <div className="min-h-dvh">
      <Nav teamName={manager.teamName ?? player.name} />
      {/*
        Kabuk geniş: kadro ekranı üç panelini yan yana açabilsin diye.
        Okuma genişliği isteyen sayfalar kendi içeriğini <Narrow> ile sarar.
      */}
      <main className="mx-auto w-full max-w-6xl px-3 pb-24 pt-5 sm:px-4 sm:pb-10">
        {children}
      </main>
    </div>
  );
}
