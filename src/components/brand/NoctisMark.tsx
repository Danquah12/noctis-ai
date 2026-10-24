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
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <img
        src="/brand/dstrike-logo.png"
        alt="DSTRIKE"
        className={cn("h-8 w-auto shrink-0 rounded-lg bg-white px-2 py-0.5 object-contain shadow-sm ring-1 ring-black/10", markClass && markClass.includes("size-12") ? "h-11" : markClass && markClass.includes("size-10") ? "h-9" : "h-8")}
      />
      {kicker ? (
        <span className="min-w-0">
          <span className="block font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            {vt(kicker)}
          </span>
        </span>
      ) : null}
    </span>
  );
}
