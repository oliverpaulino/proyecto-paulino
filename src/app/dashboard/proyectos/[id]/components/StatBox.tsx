export function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
   return (
      <div className="rounded-lg border bg-muted/20 p-4">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className={`mt-1 text-lg font-semibold ${accent ?? ""}`}>{value}</p>
      </div>
   );
}
