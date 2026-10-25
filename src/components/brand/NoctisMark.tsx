import { cn } from "@/lib/utils";
import { vt } from "@/lib/locale";

/** DSTRIKE Electric Blue D-Lightning Mark. */
export function NoctisMark({ className, title = "DSTRIKE" }: { className?: string; title?: string }) {
  return (
    <img
      src="/brand/dstrike-mark.png"
      alt={vt(title)}
      title={vt(title)}
      className={cn("noctis-mark shrink-0 rounded-lg bg-white object-contain p-0.5 shadow-sm ring-1 ring-black/10", className)}
    />
  );
}

export function NoctisLockup({
  kicker = "Noctis",
  className,
  markClass = "size-9",
}: {
  kicker?: string;
  className?: string;
  markClass?: string;
}) {
  const isLarge = Boolean(markClass && markClass.includes("size-12"));
  const isMedium = Boolean(markClass && markClass.includes("size-10"));
  const isHeaderCompact = kicker.toLowerCase() === "noctis";
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2.5", className)}>
      <img
        src="/brand/dstrike-logo.png"
        alt="DSTRIKE"
        className={cn(
          "w-auto shrink-0 rounded-md bg-white p-0.5 object-contain shadow-sm ring-1 ring-black/10",
          isLarge
            ? "h-9 max-w-[132px] sm:h-11 sm:max-w-[165px]"
            : isMedium
              ? "h-8 max-w-[112px] sm:h-9 sm:max-w-[140px]"
              : "h-6 max-w-[86px] sm:h-8 sm:max-w-[120px]",
        )}
      />
      {kicker ? (
        <span className={cn("min-w-0", isHeaderCompact ? "hidden md:block" : "block")}>
          <span className="block truncate font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-primary sm:text-[10px] sm:tracking-[0.22em]">
            {vt(kicker)}
          </span>
        </span>
      ) : null}
    </span>
  );
}
