import Link from 'next/link';
import React from 'react';

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-white p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold">Investor</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/investor/dashboard" className="block p-2 hover:bg-slate-800 rounded">
            Dashboard
          </Link>
          <Link href="/investor/deals" className="block p-2 hover:bg-slate-800 rounded">
            Deals
          </Link>
        </nav>
        <div className="border-t border-slate-700 pt-4">
          <button className="w-full text-left p-2 hover:bg-slate-800 rounded text-red-400">
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
