"use client";

import React, { useState } from 'react';
import { DealHeaderDTO } from '../types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Globe, Shield, Lock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface DealHeaderProps {
  deal: DealHeaderDTO;
}

export function DealHeader({ deal }: DealHeaderProps) {
  // Local state for optimistic update simulation
  const [privacyTier, setPrivacyTier] = useState(deal.privacyTier);

  const handlePrivacyToggle = (tier: 'Tier 1' | 'Tier 2') => {
    if (tier === privacyTier) return;

    // Mock mutation
    setPrivacyTier(tier);
  };

  return (
    <div className="flex items-center justify-between px-6 py-6 border-b bg-background">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{deal.companyName}</h1>
          <Badge variant="outline" className="text-muted-foreground font-medium">
            {deal.stage}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Globe className="h-3.5 w-3.5" />
          <a
            href={`https://${deal.rootDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {deal.rootDomain}
          </a>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center border rounded-lg p-1 bg-muted/50">
            <Button
                variant={privacyTier === 'Tier 1' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  "rounded-md h-7 px-3 text-xs font-medium transition-all",
                  privacyTier === 'Tier 1' && "bg-white shadow-sm text-foreground hover:bg-white"
                )}
                onClick={() => handlePrivacyToggle('Tier 1')}
            >
                <Lock className="mr-1.5 h-3 w-3" />
                Tier 1
            </Button>
            <Button
                variant={privacyTier === 'Tier 2' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  "rounded-md h-7 px-3 text-xs font-medium transition-all",
                  privacyTier === 'Tier 2' && "bg-white shadow-sm text-foreground hover:bg-white"
                )}
                onClick={() => handlePrivacyToggle('Tier 2')}
            >
                <Shield className="mr-1.5 h-3 w-3" />
                Tier 2
            </Button>
        </div>
      </div>
    </div>
  );
}
