import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/misc';
import { ApiError } from '@/lib/api';
import { App } from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Don't hammer the API on client errors (4xx); retry transient failures.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          theme="system"
          toastOptions={{
            classNames: {
              toast: '!bg-surface-1 !border !border-border !text-foreground !shadow-pop !rounded-lg',
              description: '!text-muted',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
