"use client";

export function MiniStat({
   label,
   value,
   accent,
}: {
   label: string;
   value: string;
   accent?: string;
}) {
   return (
      <div className="rounded-lg border bg-muted/20 p-4">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
         </p>
         <p className={`mt-1 text-2xl font-semibold ${accent ?? "text-foreground"}`}>{value}</p>
      </div>
   );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
   return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 py-10 text-center">
         <p className="text-base font-semibold">{title}</p>
         <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
      </div>
   );
}
