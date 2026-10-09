import { cn } from "@/shared/lib/cn";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  variant?: "default" | "streaming" | "failed";
}

export function MessageBubble({ role, content, variant = "default" }: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser ? "bg-accent-strong text-white" : "bg-surface-muted text-ink",
          variant === "failed" && "opacity-60",
        )}
      >
        {content}
        {variant === "streaming" && (
          <span aria-hidden className="ml-0.5 animate-pulse">
            ▍
          </span>
        )}
      </div>
    </div>
  );
}
