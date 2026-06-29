import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap flex-nowrap rounded-2xl text-sm font-bold tracking-tight transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-target [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shrink-0 w-max",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-brand-dark hover:shadow-lg active:scale-[0.96]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 active:scale-[0.96]",
        outline:
          "border-2 border-border bg-card text-foreground shadow-sm hover:border-primary/50 hover:bg-secondary active:scale-[0.96]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.96]",
        ghost: "text-foreground hover:bg-secondary active:scale-[0.96]",
        link: "text-primary underline-offset-4 hover:underline",
        brand:
          "bg-gradient-brand text-white shadow-md hover:opacity-90 active:scale-[0.96]",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 text-xs rounded-xl",
        lg: "h-14 px-10 text-base rounded-[1.25rem]",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  if (asChild && React.isValidElement(props.children)) {
    const { children, ...restProps } = props;
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cn(
        buttonVariants({ variant, size, className }),
        child.props.className,
      ),
      ...restProps,
    });
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
