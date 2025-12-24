import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React from 'react';

export function FieldRow({
  label,
  icon,
  value,
  placeholder,
  onClick,
  error,
}: {
  label: string;
  icon?: React.ReactNode;
  value?: string;
  placeholder: string;
  onClick: () => void;
  error?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
        {icon ? <span className="inline-flex items-center gap-1">{icon}{label}</span> : label}
      </label>

      <Button
        type="button"
        variant="secondary"
        onClick={onClick}
        className={cn(
          "w-full justify-between rounded-xl py-6 px-4",
          error ? "border border-red-500" : "border border-transparent"
        )}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronRight className="w-4 h-4 opacity-70" />
      </Button>

      {error ? <p className="text-xs text-red-500 mt-2">{error}</p> : null}
    </div>
  );
}
