import * as React from "react"
import { cn } from "~/lib/utils"

export interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, onCheckedChange, checked, disabled, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      if (!disabled) {
        onCheckedChange?.(!checked)
      }
    }

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-oasis-200",
          checked ? "bg-oasis-500" : "bg-warm-200",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white border border-oasis-200 shadow-sm transition-transform",
            "absolute top-[2px] left-[2px]",
            checked && "translate-x-5"
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
