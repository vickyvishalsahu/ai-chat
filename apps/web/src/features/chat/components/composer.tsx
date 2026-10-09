import { useState, type FormEvent } from "react";

interface ComposerProps {
  disabled: boolean;
  onSend: (content: string) => void;
}

export function Composer({ disabled, onSend }: ComposerProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 border-t border-line bg-surface px-5 py-3.5"
    >
      <label htmlFor="composer-input" className="sr-only">
        Message
      </label>
      <input
        id="composer-input"
        className="min-w-0 flex-1 rounded-lg border border-line px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none"
        placeholder="Message…"
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        className="rounded-lg bg-accent-strong px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </form>
  );
}
