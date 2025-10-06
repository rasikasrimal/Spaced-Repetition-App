import * as React from "react";
import { ICON_LIBRARY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconPreview } from "@/components/icon-preview";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const activeIcon = React.useMemo(() => ICON_LIBRARY.find((icon) => icon.name === value), [value]);

  const filteredIcons = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return ICON_LIBRARY;
    return ICON_LIBRARY.filter((icon) => {
      return (
        icon.name.toLowerCase().includes(term) ||
        icon.label.toLowerCase().includes(term) ||
        icon.keywords.some((keyword) => keyword.toLowerCase().includes(term))
      );
    });
  }, [query]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-full justify-start gap-3 rounded-2xl border-inverse/10 bg-inverse/10 text-left text-sm text-fg/80 transition-all duration-200 ease-in-out hover:border-inverse/20 hover:bg-inverse/15 hover:shadow-lg"
        >
          <IconPreview name={value} className="h-5 w-5" />
          <span className="flex flex-col text-left">
            <span className="text-sm font-semibold tracking-tight text-fg">{activeIcon?.label ?? value}</span>
            <span className="text-xs text-muted-foreground/80">{value}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[28rem] space-y-4 rounded-3xl p-4" sideOffset={12}>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search icons</p>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search icons..."
            className="h-11 rounded-xl border-inverse/15 bg-inverse/5 text-sm"
          />
        </div>
        <div>
          {filteredIcons.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {filteredIcons.map((icon) => {
                const isActive = icon.name === value;
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => {
                      onChange(icon.name);
                      setOpen(false);
                    }}
                    title={icon.label}
                    aria-label={`Select ${icon.label} icon`}
                    aria-pressed={isActive}
                    className={cn(
                      "group inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-bg/60 text-muted-foreground transition-all duration-200 ease-out hover:scale-105 hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                      "data-[selected=true]:border-accent data-[selected=true]:bg-accent/20 data-[selected=true]:text-accent"
                    )}
                    data-selected={isActive}
                  >
                    <IconPreview
                      name={icon.name}
                      className="h-5 w-5 transition-transform duration-150 ease-out group-hover:scale-110"
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-inverse/10 bg-inverse/5 p-6 text-center text-sm text-muted-foreground">
              No icons match "{query}". Try another keyword.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
