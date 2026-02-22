'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { updateDealFinancialsAction } from '@/features/deals/actions';
import { useToast } from '@/shared/hooks/use-toast';

const parseNumber = (val: string | number) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Remove currency symbols, commas, %, and whitespace
  const clean = val.replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? undefined : num;
};

const FinancialsSchema = z.object({
  revenueLtm: z.string().transform((val, ctx) => {
      const parsed = parseNumber(val);
      if (parsed === undefined) {
          ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Expected number",
          });
          return z.NEVER;
      }
      return parsed;
  }),
  ebitdaLtm: z.string().transform((val, ctx) => {
      const parsed = parseNumber(val);
      if (parsed === undefined) {
          ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Expected number",
          });
          return z.NEVER;
      }
      return parsed;
  }),
  marginPercent: z.string().transform((val, ctx) => {
      const parsed = parseNumber(val);
      if (parsed === undefined) {
          ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Expected number",
          });
          return z.NEVER;
      }
      return parsed;
  }),
  askingPrice: z.string().transform((val, ctx) => {
      const parsed = parseNumber(val);
      if (parsed === undefined) {
          ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Expected number",
          });
          return z.NEVER;
      }
      return parsed;
  }),
});

type FinancialsFormValues = z.input<typeof FinancialsSchema>;

interface DealFinancialsFormProps {
  dealId: string;
  initialData: {
    revenueLtm: number;
    ebitdaLtm: number;
    marginPercent: number;
    askingPrice: number;
  };
}

export function DealFinancialsForm({ dealId, initialData }: DealFinancialsFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format initial values
  const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatPercentage = (value: number) => {
      return `${value}%`;
  };

  const form = useForm<FinancialsFormValues>({
    resolver: zodResolver(FinancialsSchema),
    defaultValues: {
      revenueLtm: formatCurrency(initialData.revenueLtm),
      ebitdaLtm: formatCurrency(initialData.ebitdaLtm),
      marginPercent: formatPercentage(initialData.marginPercent),
      askingPrice: formatCurrency(initialData.askingPrice),
    },
  });

  const onSubmit = async (data: any) => { // data is transformed output (numbers)
    setIsSubmitting(true);
    try {
      const result = await updateDealFinancialsAction({
        dealId,
        revenueLtm: data.revenueLtm,
        ebitdaLtm: data.ebitdaLtm,
        marginPercent: data.marginPercent,
        askingPrice: data.askingPrice,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Financials updated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update financials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to handle blur formatting
  const handleBlur = (
      field: any,
      formatter: (val: number) => string
  ) => {
      const val = field.value;
      const num = parseNumber(val);
      if (num !== undefined && !isNaN(num)) {
          field.onChange(formatter(num));
      }
      field.onBlur();
  };

  const handleFocus = (field: any) => {
      const val = field.value;
      const num = parseNumber(val);
      if (num !== undefined && !isNaN(num)) {
          field.onChange(num.toString());
      }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-md">
        <FormField
          control={form.control}
          name="revenueLtm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Revenue LTM</FormLabel>
              <FormControl>
                <Input
                    {...field}
                    onBlur={() => handleBlur(field, formatCurrency)}
                    onFocus={() => handleFocus(field)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ebitdaLtm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>EBITDA LTM</FormLabel>
              <FormControl>
                <Input
                    {...field}
                    onBlur={() => handleBlur(field, formatCurrency)}
                    onFocus={() => handleFocus(field)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="marginPercent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Margin %</FormLabel>
              <FormControl>
                <Input
                    {...field}
                    onBlur={() => handleBlur(field, formatPercentage)}
                    onFocus={() => handleFocus(field)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="askingPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asking Price</FormLabel>
              <FormControl>
                <Input
                    {...field}
                    onBlur={() => handleBlur(field, formatCurrency)}
                    onFocus={() => handleFocus(field)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  );
}
