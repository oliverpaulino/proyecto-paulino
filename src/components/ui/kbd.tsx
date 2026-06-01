import { cn } from "@/lib/utils";

interface KbdProps {
   children: React.ReactNode;
   className?: string;
}

interface KbdGroupProps {
   children: React.ReactNode;
   className?: string;
}

export function Kbd({ children, className }: KbdProps) {
   return (
      <kbd
         className={cn(
            "rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground",
            className
         )}
      >
         {children}
      </kbd>
   );
}

export function KbdGroup({ children, className }: KbdGroupProps) {
   return (
      <span className={cn("inline-flex items-center gap-0.5", className)}>
         {children}
      </span>
   );
}
