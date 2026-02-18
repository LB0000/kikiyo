import { Badge } from "@/components/ui/badge";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import type { ApplicationStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  authorized: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  released: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pending: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const STATUS_DOT_COLORS: Record<ApplicationStatus, string> = {
  completed: "bg-green-500",
  authorized: "bg-blue-500",
  released: "bg-amber-500",
  pending: "bg-gray-400",
  rejected: "bg-red-500",
};

type StatusBadgeProps = {
  status: ApplicationStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", STATUS_STYLES[status], className)}
    >
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}
