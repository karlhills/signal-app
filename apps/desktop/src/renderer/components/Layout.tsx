import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  headerActions?: ReactNode;
}

export default function Layout({ children, headerActions }: LayoutProps) {
  return (
    <div className="min-h-screen px-8 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between rounded-3xl bg-white/80 px-6 py-4 shadow-lg shadow-slate-200/50">
          <h1 className="flex items-center gap-3 font-display text-3xl text-ink">
            <span className="flex items-center gap-2" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
              <span className="h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
            </span>
            Signal
          </h1>
          {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
        </header>
        {children}
      </div>
    </div>
  );
}
