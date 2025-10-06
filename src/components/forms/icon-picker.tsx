
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconPreview } from "@/components/icon-preview";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type IconOption = {
  name: string;
  label: string;
  keywords: string[];
};

const ICON_OPTIONS: IconOption[] = [
  { name: "Beaker", label: "Chemistry", keywords: ["chemistry", "science", "lab"] },
  { name: "Atom", label: "Physics", keywords: ["physics", "science", "atom"] },
  { name: "SquareFunction", label: "Mathematics", keywords: ["math", "function", "algebra"] },
  { name: "Dna", label: "Biology", keywords: ["biology", "science", "genetics"] },
  { name: "Cpu", label: "Computer Science", keywords: ["computer", "technology", "cpu"] },
  { name: "BookOpen", label: "Literature", keywords: ["literature", "reading", "book"] },
  { name: "Palette", label: "Art", keywords: ["art", "design", "palette"] },
  { name: "Music3", label: "Music", keywords: ["music", "sound", "melody"] },
  { name: "Globe2", label: "Geography", keywords: ["geography", "earth", "globe"] },
  { name: "Landmark", label: "History", keywords: ["history", "monument", "landmark"] },
  { name: "PenTool", label: "Writing", keywords: ["writing", "creative", "pen"] },
  { name: "Microscope", label: "Science", keywords: ["science", "research", "microscope"] },
  { name: "Lightbulb", label: "Ideas", keywords: ["idea", "insight", "innovation"] },
  { name: "Type", label: "Language", keywords: ["language", "typing", "letters"] },
  { name: "Sparkles", label: "General", keywords: ["general", "sparkles", "default"] },
  { name: "Star", label: "Favorites", keywords: ["favorite", "star", "highlight"] }
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [animatePreview, setAnimatePreview] = React.useState(false);

  const activeIcon = React.useMemo(
    () => ICON_OPTIONS.find((icon) => icon.name === value),
    [value]
  );

  const filteredIcons = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return ICON_OPTIONS;

    return ICON_OPTIONS.filter((icon) => {
      const haystack = [icon.name, icon.label, ...icon.keywords].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [query]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  React.useEffect(() => {
    setAnimatePreview(true);
    const timeout = setTimeout(() => setAnimatePreview(false), 250);
    return () => clearTimeout(timeout);
  }, [value]);

  const handleSelect = React.useCallback(
    (iconName: string) => {
      onChange(iconName);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full justify-start gap-3 rounded-2xl border-inverse/10 bg-inverse/10 text-left text-sm text-fg/80 transition-all duration-200 ease-in-out hover:border-inverse/20 hover:bg-inverse/15 hover:shadow-lg"
          >
            <IconPreview
              name={value}
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                animatePreview && "icon-picker__preview"
              )}
            />
            <span className="flex flex-col text-left">
              <span className="text-sm font-semibold tracking-tight text-fg">{activeIcon?.label ?? value}</span>
              <span className="text-xs text-muted-foreground/80">{value}</span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[26rem] space-y-4 rounded-3xl p-4" sideOffset={12}>
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
                      onClick={() => handleSelect(icon.name)}
                      title={icon.label}
                      aria-label={`Select ${icon.label} icon`}
                      aria-pressed={isActive}
                      data-selected={isActive}
                      className={cn(
                        "group inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg/60 text-muted-foreground transition-all duration-200 ease-out hover:scale-105 hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                        isActive && "border-accent bg-accent/20 text-accent shadow-sm"
                      )}
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
                No icons match &ldquo;{query}&rdquo;. Try another keyword.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <style jsx>{`
        @keyframes iconPickerPopIn {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .icon-picker__preview {
          animation: iconPickerPopIn 0.25s ease;
        }
      `}</style>
    </>
  );
};
