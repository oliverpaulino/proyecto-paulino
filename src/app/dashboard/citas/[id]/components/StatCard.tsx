import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

export default function StatCard({
   label,
   value,
   icon,
   compact = false,
   bgColor = "bg-brand-blue",
   textColor = "text-white",
   labelColor = "text-brand-yellow",

}: {
   label: string;
   value: number | string;
   icon: ReactNode;
   compact?: boolean;
   bgColor?: string;
   textColor?: string;
   labelColor?: string;
}) {
   return (
      <Card className={`${bgColor} `}>
         <CardHeader className="pb-2">
            <CardDescription className={`flex items-center gap-2 ${textColor}`}>
               <span className={`rounded-full ${labelColor} px-2.5 py-1 text-xs font-semibold`}>
                  {icon}
               </span>
               {label}
            </CardDescription>
            <CardTitle className={`${textColor} ${compact ? "text-lg" : "text-2xl"}`}>{value}</CardTitle>
         </CardHeader>
      </Card>
   );
}