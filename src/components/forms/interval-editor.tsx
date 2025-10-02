import * as React from "react";
import { DEFAULT_INTERVALS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntervalEditorProps {
  value: number[];
  onChange: (intervals: number[]) => void;
}

export const IntervalEditor: React.FC<IntervalEditorProps> = ({ value, onChange }) => {
  const [customValue, setCustomValue] = React.useState("");

  const togglePreset = (days: number) => {
    if (value.includes(days)) {
      onChange(value.filter((interval) => interval !== days));
    } else {
      onChange([...value, days].sort((a, b) => a - b));
    }
  };

  const handleAddCustom = () => {
    const parsed = Number.parseInt(customValue.trim(), 10);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    if (value.includes(parsed)) return;
    onChange([...value, parsed].sort((a, b) => a - b));
    setCustomValue("");
  };

  const handleCustomKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddCustom();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DEFAULT_INTERVALS.map((preset) => {
          const active = value.includes(preset.days);
          return (
            <Button
              key={preset.id}
              type="button"
              variant={active ? "default" : "outline"}
              className="rounded-full px-4 text-sm shadow-sm hover:-translate-y-0.5"
              onClick={() => togglePreset(preset.days)}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={handleCustomKeyDown}
          placeholder="Custom (days)"
          className="h-11 w-32"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
        />
        <Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={handleAddCustom}>
          Add
        </Button>
      </div>
      <p className="text-xs text-zinc-400">
        Intervals determine when the topic will be reviewed again. The first interval schedules the
        next session.
      </p>
    </div>
  );
};
