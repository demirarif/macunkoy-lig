"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { holidayAction, unholidayAction, type ActionResult } from "./actions";
import type { GameweekStatus } from "@/lib/domain/types";

/** Bir haftanın ikincil işlemleri: tatil işaretleme ve kapanmış haftayı geri açma. */
export function GameweekActions({
  gameweek,
}: {
  gameweek: { id: string; number: number; status: GameweekStatus };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<ActionResult | null>(null);

  function call(fn: () => Promise<ActionResult>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const result = await fn();
      setMessage(result);
      if (!result.error) router.refresh();
    });
  }

  const canHoliday = gameweek.status === "open" || gameweek.status === "locked";
  const canUnholiday = gameweek.status === "holiday";

  if (!canHoliday && !canUnholiday) return null;

  return (
    <div className="mt-2.5 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {canHoliday && (
          <SmallButton
            disabled={pending}
            onClick={() =>
              call(
                () => holidayAction(gameweek.id),
                `${gameweek.number}. hafta maç yok olarak işaretlensin mi? Bu haftanın kadroları silinir ve kimse puan almaz.`,
              )
            }
          >
            Bu hafta maç yok
          </SmallButton>
        )}
        {canUnholiday && (
          <SmallButton disabled={pending} onClick={() => call(() => unholidayAction(gameweek.id))}>
            Geri al
          </SmallButton>
        )}
      </div>
      {message && (
        <p
          className={`text-[11px] font-semibold ${message.error ? "text-danger" : "text-neon"}`}
        >
          {message.error ?? message.ok}
        </p>
      )}
    </div>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-ink-800 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-chalk-dim ring-1 ring-ink-700 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
