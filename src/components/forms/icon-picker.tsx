import * as React from "react";
import { ICON_LIBRARY, type IconOption } from "@/lib/constants";
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

  const groupedIcons = React.useMemo(() => {
    const order: IconOption["category"][] = ["Science", "Math", "Language", "History", "Technology", "Misc"];
    const groups = new Map<IconOption["category"], IconOption[]>();
    for (const icon of filteredIcons) {
      const bucket = groups.get(icon.category);
      if (bucket) {
        bucket.push(icon);
      } else {
        groups.set(icon.category, [icon]);
      }
    }
    return order
      .map((category) => ({ category, icons: groups.get(category) ?? [] }))
      .filter((entry) => entry.icons.length > 0);
  }, [filteredIcons]);

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
          className="h-14 w-full justify-start gap-3 rounded-2xl border-inverse/10 bg-inverse/10 text-left text-sm text-fg/80 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-inverse/20 hover:bg-inverse/15 hover:shadow-lg"
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
            placeholder="Search science, math, language…"
            className="h-11 rounded-xl border-inverse/15 bg-inverse/5 text-sm"
          />
        </div>
        <div className="space-y-5">
          {groupedIcons.length > 0 ? (
            groupedIcons.map(({ category, icons }) => (
              <section key={category} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">{category}</p>
                <div className="grid grid-cols-6 gap-2">
                  {icons.map((icon) => {
                    const isActive = icon.name === value;
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() => {
                          onChange(icon.name);
                          setOpen(false);
                        }}
                        title={`${icon.label}`}
                        aria-label={`Select ${icon.label}`}
                        aria-pressed={isActive}
                        className={cn(
                          "group flex h-14 items-center justify-center rounded-2xl border border-transparent bg-inverse/5 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-accent/40 hover:bg-inverse/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                          isActive && "border-accent bg-inverse/10 shadow-lg"
                        )}
                      >
                        <IconPreview
                          name={icon.name}
                          className="h-6 w-6 transition-transform duration-150 ease-in-out group-hover:scale-110"
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-inverse/10 bg-inverse/5 p-6 text-center text-sm text-muted-foreground">
              No icons match “{query}”. Try another keyword.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
