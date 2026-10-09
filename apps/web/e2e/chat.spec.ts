import { expect, test } from "@playwright/test";

test("send a message, see the streamed reply, and see it persist on reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Pick a conversation, or start a new chat.")).toBeVisible();

  await page.getByRole("button", { name: "+ New chat" }).click();
  await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Say something to start the conversation.")).toBeVisible();

  await page.getByLabel("Message").fill("Hello, fake Groq!");
  await page.getByLabel("Message").press("Enter");

  const thread = page.getByRole("main");
  await expect(thread.getByText("Hello, fake Groq!")).toBeVisible();
  await expect(thread.getByText("This is a fake reply for tests.")).toBeVisible();

  const sidebar = page.getByRole("navigation", { name: "Conversations" });
  await expect(sidebar.getByRole("link", { name: "Hello, fake Groq!" })).toBeVisible();

  await page.reload();
  await expect(thread.getByText("Hello, fake Groq!")).toBeVisible();
  await expect(thread.getByText("This is a fake reply for tests.")).toBeVisible();
});
