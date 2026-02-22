import React from 'react';
import { Deal } from "@/features/deals/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  return (
    <Card className="w-full mb-2 cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold leading-tight">{deal.companyName}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{deal.industry}</p>
          <div className="flex items-center justify-between mt-2">
            <Badge variant={deal.privacyTier === 'Tier 1' ? 'default' : 'secondary'}>
              {deal.privacyTier}
            </Badge>
            {deal.fitScore !== undefined && (
              <span className="text-sm font-medium" data-testid="fit-score">
                Fit: {deal.fitScore}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
