import * as React from "react";
import { COLOR_PRESETS } from "@/lib/constants";
import { getAccessibleTextColor, getTintedSurfaceColor, sanitizeColorInput } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);

  const activePreset = React.useMemo(() => COLOR_PRESETS.find((preset) => preset.value === value), [value]);
  const surfaceColor = React.useMemo(() => getTintedSurfaceColor(value), [value]);
  const textColor = React.useMemo(() => getAccessibleTextColor(surfaceColor), [surfaceColor]);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  React.useEffect(() => {
    if (!open) {
      setInputValue(value);
      setError(null);
    }
  }, [open, value]);

  const handlePresetSelect = (presetValue: string) => {
    onChange(presetValue);
    setInputValue(presetValue);
    setError(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setInputValue(next);
    if (!next.trim()) {
      setError(null);
      return;
    }

    const sanitized = sanitizeColorInput(next);
    if (!sanitized) {
      setError("Invalid color format");
      return;
    }

    setError(null);
    onChange(sanitized);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-full justify-start gap-3 rounded-2xl border-inverse/10 bg-inverse/10 text-left text-sm text-fg/80 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-inverse/20 hover:bg-inverse/15 hover:shadow-lg"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-inverse/10"
            style={{ backgroundColor: surfaceColor, color: textColor }}
          >
            <span className="h-6 w-6 rounded-full border border-white/30" style={{ backgroundColor: value }} />
          </span>
          <span className="flex flex-col text-left">
            <span className="text-sm font-semibold tracking-tight text-fg">
              {activePreset ? activePreset.name : "Custom color"}
            </span>
            <span className="text-xs text-muted-foreground/80">{value}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4 rounded-3xl p-4" sideOffset={12}>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Standard palette</p>
          <div className="grid grid-cols-5 gap-3">
            {COLOR_PRESETS.map((preset) => {
              const isActive = preset.value === value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetSelect(preset.value)}
                  title={`${preset.name} (${preset.value})`}
                  aria-label={`${preset.name} (${preset.value})`}
                  aria-pressed={isActive}
                  data-selected={isActive}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition-all duration-200 ease-in-out hover:scale-110 hover:border-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                    isActive && "ring-2 ring-accent ring-offset-2 ring-offset-bg"
                  )}
                  style={{ backgroundColor: preset.value }}
                >
                  <span className="sr-only">{preset.name} {preset.value}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom color</p>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="#34a1eb · rgb(34,161,235) · hsl(221,83%,53%)"
            className={cn(
              "h-11 rounded-xl border-inverse/15 bg-inverse/5 text-sm",
              error && "border-error/50 focus-visible:ring-error/60"
            )}
            aria-invalid={error ? "true" : "false"}
          />
          {error ? <p className="text-xs font-medium text-error">{error}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
};
