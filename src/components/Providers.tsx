"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "@upstash/realtime/client";
import { useState } from "react";
import { ActiveRoomsProvider } from "@/contexts/ActiveRoomsContext";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(new QueryClient());

  return (
    <RealtimeProvider>
      <QueryClientProvider client={queryClient}>
        <ActiveRoomsProvider>{children}</ActiveRoomsProvider>
      </QueryClientProvider>
    </RealtimeProvider>
  );
};
