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

  const handleAddCustom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(customValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    if (value.includes(parsed)) return;
    onChange([...value, parsed].sort((a, b) => a - b));
    setCustomValue("");
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
              className="rounded-full px-4"
              onClick={() => togglePreset(preset.days)}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
      <form onSubmit={handleAddCustom} className="flex items-center gap-2">
        <Input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          placeholder="Custom (days)"
          className="w-32"
          inputMode="numeric"
        />
        <Button type="submit" variant="outline">
          Add
        </Button>
      </form>
      <p className="text-xs text-zinc-400">
        Intervals determine when the topic will be reviewed again. The first interval schedules the
        next session.
      </p>
    </div>
  );
};
