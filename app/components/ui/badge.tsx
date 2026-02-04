import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-oasis-300 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-oasis-500 text-white hover:bg-oasis-600",
        secondary:
          "border-transparent bg-oasis-100 text-oasis-700 hover:bg-oasis-200",
        outline: "text-warm-700 border-oasis-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
