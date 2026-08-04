import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 animate-fade-in">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
