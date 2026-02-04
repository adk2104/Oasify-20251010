import * as React from "react"
import { cn } from "~/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-oasis-200 bg-white px-3 py-2 text-sm text-warm-800 placeholder:text-warm-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oasis-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
