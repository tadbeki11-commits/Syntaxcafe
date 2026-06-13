import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from 'next-themes';
import { bootstrapApp } from './bootstrap/container';
import { startSyncServices } from './bootstrap/sync';
import { registerClearMenuOnClose } from './bootstrap/clear-menu-on-close';
import '@/infrastructure/sync/sync-engine';

void bootstrapApp().then(() => startSyncServices());
void registerClearMenuOnClose();


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 3000,
            className: '!bg-popover !text-popover-foreground !border !border-border !shadow-md !rounded-full !text-[13px] !font-semibold !px-4 !py-2',
            success: {
              iconTheme: { primary: 'hsl(var(--success))', secondary: 'hsl(var(--success-foreground))' },
            },
            error: {
              duration: 2000,
              iconTheme: { primary: 'hsl(var(--destructive))', secondary: 'hsl(var(--destructive-foreground))' },
            },
          }}
        />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
