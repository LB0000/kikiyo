import { FileX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon?: LucideIcon;
  title?: string;
  description?: string;
};

export function EmptyState({
  icon: Icon = FileX,
  title = "データがありません",
  description,
}: Props) {
  return (
    <div role="status" className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground/60" aria-hidden="true" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground/70">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
