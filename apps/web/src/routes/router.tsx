import { createBrowserRouter } from "react-router";

import { ChatRoute } from "./chat-route";
import { HomeRoute } from "./home-route";
import { RootLayout } from "./root-layout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: "chat/:conversationId", element: <ChatRoute /> },
    ],
  },
]);
