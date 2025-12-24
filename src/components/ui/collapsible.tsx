import * as React from "react"
import { cn } from "@/lib/utils"

const CollapsibleContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

const Collapsible = ({
  open,
  onOpenChange,
  children,
  ...props
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : uncontrolledOpen;
  const handleChange = isControlled ? onOpenChange! : setUncontrolledOpen;

  return (
    <CollapsibleContext.Provider value={{ open: !!currentOpen, onOpenChange: handleChange }}>
        <div {...props}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, onClick, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(CollapsibleContext);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onOpenChange(!open);
        onClick?.(e);
    }

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: handleClick,
            // @ts-ignore
            ref,
        });
    }

    return (
        <button
            ref={ref}
            onClick={handleClick}
            className={className}
            {...props}
        >
            {children}
        </button>
    )

})
CollapsibleTrigger.displayName = "CollapsibleTrigger"


const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open } = React.useContext(CollapsibleContext);
  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden", className)}
      {...props}
    >
        {children}
    </div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
}
