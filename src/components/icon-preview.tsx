import * as React from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

type IconPreviewProps = {
  name: string;
  className?: string;
};

export const IconPreview: React.FC<IconPreviewProps> = ({ name, className }) => {
  const Icon = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Sparkles;
  return <Icon className={cn("h-5 w-5", className)} />;
};
