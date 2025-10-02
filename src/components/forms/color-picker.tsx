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
        <Button variant="outline" className="h-10 w-full justify-start gap-3">
          <span
            className="h-6 w-6 rounded-full border border-white/30"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm text-zinc-200">{value.toUpperCase()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" sideOffset={12}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Color</p>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-transparent transition-transform hover:scale-105",
                option === value && "ring-2 ring-accent"
              )}
              style={{ backgroundColor: option }}
              onClick={() => onChange(option)}
            >
              {option === value ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
