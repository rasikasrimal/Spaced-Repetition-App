import * as React from "react";
import { ICON_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconPreview } from "@/components/icon-preview";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full justify-start gap-3 rounded-xl border-inverse/10 bg-inverse/10 text-left text-sm text-fg/80 hover:bg-inverse/15"
        >
          <IconPreview name={value} className="h-5 w-5" />
          <span className="font-medium tracking-tight">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" sideOffset={12}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Icon</p>
        <div className="grid grid-cols-4 gap-3">
          {ICON_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "flex h-12 items-center justify-center rounded-xl border border-inverse/10 bg-inverse/5 transition-colors hover:border-inverse/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                option === value && "border-accent"
              )}
            >
              <IconPreview name={option} className="h-5 w-5" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
