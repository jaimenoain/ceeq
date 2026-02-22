"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

interface DealTabsProps {
  dealId: string;
}

export function DealTabs({ dealId }: DealTabsProps) {
  const pathname = usePathname();
  const baseUrl = `/searcher/deals/${dealId}`;

  const tabs = [
    { name: 'Overview', href: baseUrl, isActive: pathname === baseUrl },
    { name: 'Contacts', href: `${baseUrl}/contacts`, isActive: pathname.startsWith(`${baseUrl}/contacts`) },
    { name: 'Activity', href: `${baseUrl}/activity`, isActive: pathname.startsWith(`${baseUrl}/activity`) },
  ];

  const disabledTabs = ['Documents', 'Financials'];

  return (
    <div className="flex items-center gap-2 border-b px-6 bg-background">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={cn(
            "flex h-12 items-center justify-center border-b-2 px-4 text-sm font-medium transition-colors hover:text-primary",
            tab.isActive
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          )}
        >
          {tab.name}
        </Link>
      ))}
      {disabledTabs.map((tab) => (
        <div
          key={tab}
          className="flex h-12 items-center justify-center border-b-2 border-transparent px-4 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
        >
          {tab}
        </div>
      ))}
    </div>
  );
}
