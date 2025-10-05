import * as React from "react";
import { COLOR_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full justify-start gap-3 rounded-xl border-inverse/10 bg-inverse/10 text-left text-sm text-fg/80 hover:bg-inverse/15"
        >
          <span className="h-6 w-6 rounded-full border border-inverse/20" style={{ backgroundColor: value }} />
          <span className="font-medium tracking-tight">{value.toUpperCase()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" sideOffset={12}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color</p>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl border border-inverse/10 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                option === value && "border-accent ring-2 ring-accent/60"
              )}
              style={{ backgroundColor: option }}
              onClick={() => onChange(option)}
            >
              {option === value ? <span className="h-2 w-2 rounded-full bg-inverse" /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
