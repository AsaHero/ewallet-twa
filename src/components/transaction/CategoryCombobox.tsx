import { useState, useMemo, useRef, useEffect } from "react";
import { Check, Search, Tag, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Category, Subcategory } from "@/core/types";

// UI Components (mimicking the style of FieldRow and Input)
import { Card, CardContent } from "@/components/ui/card";

interface CategoryComboboxProps {
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategoryId?: number;
  selectedSubcategoryId?: number;
  onSelect: (categoryId: number, subcategoryId?: number) => void;
  className?: string;
  placeholder?: string;
}

export function CategoryCombobox({
  categories,
  subcategories,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelect,
  className,
  placeholder,
}: CategoryComboboxProps) {
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
    if (!q) {
      // Return all categories, and nested subcategories
      return categories.map((cat) => ({
        type: "category" as const,
        item: cat,
        subitems: subcategories
          .filter((s) => s.category_id === cat.id)
          .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
      })).sort((a, b) => (a.item.position ?? 999) - (b.item.position ?? 999));
    }

    // Filter logic
    return categories
      .map((cat) => {
        const matchingSub = subcategories
          .filter((s) => s.category_id === cat.id && s.name.toLowerCase().includes(q))
          .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

        const catMatches = cat.name.toLowerCase().includes(q);

        if (!catMatches && matchingSub.length === 0) return null;

        return {
          type: "category" as const,
          item: cat,
          subitems: matchingSub,
          // If category matches, show all subs? Or only matching subs?
          // Let's show all subs if category matches, to allow easy exploration
          // But if only sub matches, we need to show the category as a header (maybe disabled for selection if not matched directly? No, usually clickable)
          // Actually common pattern: if category matches, show it. If sub matches, show it under category.
          // If category matches but sub doesn't, we show category, and maybe subs if we want context.

          // Let's keep it simple: Show category if it matches OR if any sub matches.
          // Show sub only if it matches OR if category matches (optional).
          // Current impl: Only show subs that match if category doesn't match.
          // If category matches, show ALL subs? Let's hide non-matching subs to reduce noise in search.
        };
      })
      .filter((x) => x !== null) as { type: "category"; item: Category; subitems: Subcategory[] }[];
  }, [categories, subcategories, search]);

  // Derived selected labels
  const selectedLabel = useMemo(() => {
    if (!selectedCategoryId) return "";
    const cat = categories.find((c) => c.id === selectedCategoryId);
    if (!cat) return "";
    let label = `${cat.emoji ?? ""} ${cat.name}`.trim();

    if (selectedSubcategoryId) {
      const sub = subcategories.find((s) => s.id === selectedSubcategoryId);
      if (sub) {
        label += ` / ${sub.emoji ?? ""} ${sub.name}`.trim();
      }
    }
    return label;
  }, [categories, subcategories, selectedCategoryId, selectedSubcategoryId]);

  const handleSelectCategory = (catId: number) => {
    onSelect(catId, undefined);
    setOpen(false);
    setSearch("");
  };

  const handleSelectSubcategory = (catId: number, subId: number) => {
    onSelect(catId, subId);
    setOpen(false);
    setSearch("");
  };

  return (
    <Card className="border-0 bg-card/50 backdrop-blur-sm z-20 overflow-visible">
        <CardContent className="p-4 relative" ref={containerRef}>
             <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
                <Tag className="inline w-3 h-3 mr-1" />
                {t('transaction.category') || 'Category'}
            </label>

            <div
                className="relative"
            >
                <div
                    className={cn(
                        "flex items-center w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent transition-all cursor-text",
                        open ? "border-primary ring-2 ring-primary/20" : "hover:border-border",
                        className
                    )}
                    onClick={() => {
                        setOpen(true);
                        setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                >
                    {/* If we have a selection and NOT searching, show the selection in a nice way or just text?
                        The prompt asked for "Search with dropdown". Usually this implies an Input that filters.
                        If selected, the input value is the selected name?
                    */}
                    { !open && selectedCategoryId ? (
                         <div className="flex-1 flex items-center gap-2 overflow-hidden">
                            <span className="truncate text-foreground font-medium">{selectedLabel}</span>
                         </div>
                    ) : (
                        <div className="flex-1 flex items-center gap-2">
                             <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                             <input
                                ref={inputRef}
                                className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground/50 min-w-0"
                                placeholder={selectedCategoryId ? selectedLabel : (placeholder || t('transaction.searchCategory') || "Search category...")}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => setOpen(true)}
                             />
                        </div>
                    )}

                    <div className="shrink-0 text-muted-foreground">
                        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
                    </div>
                </div>

                {/* Dropdown */}
                {open && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl max-h-[60vh] overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2 space-y-1">
                            {filteredItems.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    {t('common.noResults') || "No results found"}
                                </div>
                            ) : (
                                filteredItems.map(({ item: cat, subitems }) => (
                                    <div key={cat.id} className="space-y-1">
                                        {/* Category Item */}
                                        <button
                                            type="button"
                                            onClick={() => handleSelectCategory(cat.id)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                                selectedCategoryId === cat.id && !selectedSubcategoryId
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "hover:bg-accent/50 text-foreground"
                                            )}
                                        >
                                            <span className="text-base">{cat.emoji}</span>
                                            <span className="flex-1 truncate">{cat.name}</span>
                                            {selectedCategoryId === cat.id && !selectedSubcategoryId && (
                                                <Check className="w-4 h-4 opacity-100" />
                                            )}
                                        </button>

                                        {/* Subitems */}
                                        {subitems.length > 0 && (
                                            <div className="pl-4 space-y-1 border-l-2 border-border/30 ml-3 mb-2">
                                                {subitems.map(sub => (
                                                    <button
                                                        key={sub.id}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // prevent triggering category select if nested (it's not here but good practice)
                                                            handleSelectSubcategory(cat.id, sub.id);
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                                                            selectedSubcategoryId === sub.id
                                                                ? "bg-primary/10 text-primary font-medium"
                                                                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        <span className="text-sm">{sub.emoji}</span>
                                                        <span className="flex-1 truncate">{sub.name}</span>
                                                        {selectedSubcategoryId === sub.id && (
                                                            <Check className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
