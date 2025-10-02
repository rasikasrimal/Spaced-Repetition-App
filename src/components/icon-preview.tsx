import * as React from "react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconPreviewProps = {
  name: string;
  className?: string;
};

const iconRegistry = Icons as unknown as Record<string, LucideIcon>;

export const IconPreview: React.FC<IconPreviewProps> = ({ name, className }) => {
  const IconComponent = iconRegistry[name] ?? iconRegistry["Sparkles"];
  return <IconComponent className={cn("h-5 w-5", className)} />;
};