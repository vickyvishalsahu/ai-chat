import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/render";

import { ConversationList } from "./conversation-list";

describe("ConversationList", () => {
  it("shows an empty state when there are no conversations", () => {
    renderWithProviders(<ConversationList conversations={[]} />);
    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
  });

  it("links each conversation to its thread and marks the active one", () => {
    renderWithProviders(
      <ConversationList
        conversations={[
          { id: "a", title: "First", updatedAt: new Date() },
          { id: "b", title: "Second", updatedAt: new Date() },
        ]}
      />,
      { route: "/chat/b" },
    );

    expect(screen.getByRole("link", { name: "First" })).toHaveAttribute("href", "/chat/a");
    expect(screen.getByRole("link", { name: "Second" })).toHaveAttribute("aria-current", "page");
  });
});
