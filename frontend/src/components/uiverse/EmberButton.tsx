import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

// Uiverse-style primary action button (gradient + sheen sweep + press spring).
export function EmberButton({ icon, children, className, ...props }: EmberButtonProps) {
  return (
    <button className={cn("uv-ember-btn", className)} {...props}>
      {children}
      {icon && <span className="uv-ico">{icon}</span>}
    </button>
  );
}
