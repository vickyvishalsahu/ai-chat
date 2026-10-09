import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapperFor(queryClient: QueryClient, route: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

interface ProviderOptions {
  queryClient?: QueryClient;
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    route = "/",
    ...options
  }: ProviderOptions & RenderOptions = {},
) {
  return render(ui, { wrapper: wrapperFor(queryClient, route), ...options });
}

export function renderHookWithProviders<T>(
  hook: () => T,
  { queryClient = createTestQueryClient(), route = "/" }: ProviderOptions = {},
) {
  return renderHook(hook, { wrapper: wrapperFor(queryClient, route) });
}
