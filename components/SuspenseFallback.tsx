import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SuspenseFallbackProps = {
  fullScreen?: boolean;
};

export function SuspenseFallback({
  fullScreen = false,
}: SuspenseFallbackProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex w-full items-center justify-center gap-2 bg-background text-sm text-muted-foreground",
        fullScreen ? "h-dvh" : "min-h-[calc(100dvh-4rem)]",
      )}
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-4 animate-spin text-primary motion-reduce:animate-none"
      />
      <span>Loading...</span>
    </div>
  );
}
