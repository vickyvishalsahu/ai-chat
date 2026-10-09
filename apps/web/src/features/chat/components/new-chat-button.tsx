import { useNavigate } from "react-router";

// A fresh id only becomes a stored conversation once its first message is sent.
export function NewChatButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/chat/${crypto.randomUUID()}`)}
      className="w-full rounded-lg border border-accent px-3 py-2 text-sm font-semibold text-accent-strong hover:bg-accent-soft"
    >
      + New chat
    </button>
  );
}
