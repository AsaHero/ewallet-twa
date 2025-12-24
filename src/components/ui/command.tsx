import * as React from "react"
import { cn } from "@/lib/utils"

// Minimal implementation simulating cmdk

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {}
const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
)
Command.displayName = "Command"

// Context for filtering
const CommandContext = React.createContext<{
  search: string;
  setSearch: (s: string) => void;
}>({ search: "", setSearch: () => {} });

const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const { setSearch } = React.useContext(CommandContext);
  return (
    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onChange={(e) => setSearch(e.target.value)}
        {...props}
      />
    </div>
  )
})
CommandInput.displayName = "CommandInput"

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))
CommandList.displayName = "CommandList"

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  // Logic to hide if items exist is hard without real cmdk,
  // but we can just render it. The consumer usually conditionally renders based on filtered list length?
  // No, cmdk handles it.
  // For this minimal impl, we might show "No results" if we knew the count.
  // We'll leave it simple: always render, let CSS or user handle.
  return <div ref={ref} className="py-6 text-center text-sm" {...props} />
})
CommandEmpty.displayName = "CommandEmpty"

const CommandGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = "CommandGroup"

const CommandItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; onSelect?: () => void }
>(({ className, value, onSelect, ...props }, ref) => {
  const { search } = React.useContext(CommandContext);
  // Simple substring filter
  const isMatch = !search || value.toLowerCase().includes(search.toLowerCase());

  if (!isMatch) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={onSelect}
      {...props}
    />
  )
})
CommandItem.displayName = "CommandItem"

// Wrapper to provide context
const CommandRoot = ({ children, ...props }: CommandProps) => {
  const [search, setSearch] = React.useState("");
  return (
    <CommandContext.Provider value={{ search, setSearch }}>
      <Command {...props}>{children}</Command>
    </CommandContext.Provider>
  )
}


export {
  CommandRoot as Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  // CommandShortcut,
  // CommandSeparator,
}
