import * as React from "react";
import { ICON_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconPreview } from "@/components/icon-preview";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 w-full justify-start gap-3">
          <IconPreview name={value} className="h-5 w-5" />
          <span className="text-sm text-zinc-200">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" sideOffset={12}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Icon</p>
        <div className="grid grid-cols-4 gap-2">
          {ICON_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className="flex h-12 w-full items-center justify-center rounded-lg border border-transparent bg-card/80 transition hover:border-accent"
            >
              <IconPreview name={option} className="h-5 w-5" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
