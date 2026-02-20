import Link from 'next/link';
import React from 'react';

export default function SearcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold">Searcher</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/searcher/dashboard" className="block p-2 hover:bg-slate-100 rounded">
            Dashboard
          </Link>
          <Link href="/searcher/universe" className="block p-2 hover:bg-slate-100 rounded">
            Universe
          </Link>
          <Link href="/searcher/pipeline" className="block p-2 hover:bg-slate-100 rounded">
            Pipeline
          </Link>
        </nav>
        <div className="border-t border-slate-200 pt-4">
          <button className="w-full text-left p-2 hover:bg-slate-100 rounded text-red-600">
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
