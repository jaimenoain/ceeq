import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Ceeq Logo</h1>
      </div>
      {children}
    </div>
  );
}
