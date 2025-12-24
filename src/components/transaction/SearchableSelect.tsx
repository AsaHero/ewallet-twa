import { useState, useMemo, useRef, useEffect } from "react";
import { Check, Search, ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// UI Components
import { Card, CardContent } from "@/components/ui/card";

export interface SearchableItem {
  id: number | string;
  label: string;
  emoji?: string;
}

interface SearchableSelectProps {
  items: SearchableItem[];
  value?: number | string;
  onSelect: (id: number | string | undefined) => void;
  label: string;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  items,
  value,
  onSelect,
  label,
  placeholder,
  icon,
  className,
  disabled
}: SearchableSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(item =>
      item.label.toLowerCase().includes(q)
    );
  }, [items, search]);

  const selectedItem = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return items.find(i => i.id === value);
  }, [items, value]);

  const handleSelect = (id: number | string) => {
    onSelect(id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(undefined);
    setSearch("");
  };

  return (
    <Card className={cn(
        "border-0 bg-card/50 backdrop-blur-sm overflow-visible transition-all",
        open ? "z-50 relative" : "z-20 relative",
        className
    )}>
        <CardContent className="p-4 relative" ref={containerRef}>
             <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
                {icon}
                {label}
            </label>

            <div className="relative">
                <div
                    className={cn(
                        "flex items-center w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent transition-all cursor-text",
                        open ? "border-primary ring-2 ring-primary/20" : "hover:border-border",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => {
                        if (disabled) return;
                        setOpen(true);
                        setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                >
                    { !open && selectedItem ? (
                         <div className="flex-1 flex items-center gap-2 overflow-hidden">
                            {selectedItem.emoji && <span className="text-lg">{selectedItem.emoji}</span>}
                            <span className="truncate text-foreground font-medium">{selectedItem.label}</span>
                         </div>
                    ) : (
                        <div className="flex-1 flex items-center gap-2">
                             <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                             <input
                                ref={inputRef}
                                className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground/50 min-w-0"
                                placeholder={selectedItem ? selectedItem.label : (placeholder || "Search...")}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => setOpen(true)}
                                disabled={disabled}
                             />
                        </div>
                    )}

                    <div className="shrink-0 flex items-center gap-2">
                        {selectedItem && !open && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </div>
                </div>

                {/* Dropdown - High Z-Index */}
                {open && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl max-h-[60vh] overflow-y-auto z-[50] animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2 space-y-1">
                            {filteredItems.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    {t('common.noResults')}
                                </div>
                            ) : (
                                filteredItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelect(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                            value === item.id
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "hover:bg-accent/50 text-foreground"
                                        )}
                                    >
                                        {item.emoji && <span className="text-base">{item.emoji}</span>}
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {value === item.id && (
                                            <Check className="w-4 h-4 opacity-100" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
  );
}
