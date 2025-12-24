import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export type PickerItem = { id: number; label: string };

export function PickerDialog({
  open,
  onOpenChange,
  title,
  items,
  value,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  items: PickerItem[];
  value?: number;
  onPick: (id: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Command className="border-t">
          <CommandInput placeholder="Search..." />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {items.map((it) => (
                <CommandItem
                  key={it.id}
                  value={it.label}
                  onSelect={() => {
                    onPick(it.id);
                    onOpenChange(false);
                  }}
                  className="py-3"
                >
                  <span className="flex-1">{it.label}</span>
                  {value === it.id ? <Check className="w-4 h-4" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
