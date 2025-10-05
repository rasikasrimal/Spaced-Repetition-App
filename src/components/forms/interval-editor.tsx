import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntervalEditorProps {
  value: number[];
  onChange: (intervals: number[]) => void;
}

const sanitizeIntervals = (intervals: number[]) =>
  [...new Set(intervals.filter((interval) => Number.isFinite(interval) && interval > 0))].sort(
    (a, b) => a - b
  );

export const IntervalEditor: React.FC<IntervalEditorProps> = ({ value, onChange }) => {
  const [drafts, setDrafts] = React.useState<string[]>(() => value.map((interval) => String(interval)));

  React.useEffect(() => {
    if (value.length === 0) {
      onChange([1]);
    }
  }, [value, onChange]);

  React.useEffect(() => {
    setDrafts(value.map((interval) => String(interval)));
  }, [value]);

  const commitValue = (index: number) => {
    const raw = drafts[index] ?? "";
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      const next = value.filter((_, itemIndex) => itemIndex !== index);
      onChange(next.length > 0 ? next : [1]);
      return;
    }

    const next = sanitizeIntervals(value.map((interval, itemIndex) => (itemIndex === index ? parsed : interval)));
    onChange(next.length > 0 ? next : [parsed]);
  };

  const handleChange = (index: number, nextValue: string) => {
    setDrafts((prev) => {
      const copy = [...prev];
      copy[index] = nextValue;
      return copy;
    });
  };

  const handleRemove = (index: number) => {
    const next = value.filter((_, itemIndex) => itemIndex !== index);
    onChange(next.length > 0 ? next : [1]);
  };

  const handleAddInterval = () => {
    const suggested = value.length > 0 ? value[value.length - 1] + 7 : 1;
    const next = sanitizeIntervals([...value, suggested]);
    onChange(next);
    setDrafts(next.map((interval) => String(interval)));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {drafts.map((draft, index) => (
          <div key={`interval-${index}`} className="flex items-center gap-3">
            <Input
              value={draft}
              onChange={(event) => handleChange(index, event.target.value)}
              onBlur={() => commitValue(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitValue(index);
                }
              }}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              className="h-11 w-32 rounded-xl"
              aria-label={`Interval ${index + 1} in days`}
            />
            <span className="text-sm text-muted-foreground">days</span>
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-xs text-muted-foreground hover:text-fg"
              onClick={() => handleRemove(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={handleAddInterval}>
        Add interval
      </Button>

      <p className="text-xs text-muted-foreground">
        Intervals determine when the topic will be reviewed again. The first interval schedules the next session, and you can
        add or remove steps at any time to stay flexible.
      </p>
    </div>
  );
};
