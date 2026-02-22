'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { updateCompanyFirmographicsAction } from '@/features/deals/actions';

const firmographicsSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  employees: z.coerce.number().min(0, 'Employees must be a positive number'),
  industry: z.string().min(1, 'Industry is required'),
});

type FirmographicsFormValues = z.infer<typeof firmographicsSchema>;

interface CompanyFirmographicsFormProps {
  companyId: string;
  initialData: {
    location?: string | null;
    employees?: number | null;
    industry?: string | null;
  };
}

export function CompanyFirmographicsForm({
  companyId,
  initialData,
}: CompanyFirmographicsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FirmographicsFormValues>({
    resolver: zodResolver(firmographicsSchema),
    defaultValues: {
      location: initialData.location || '',
      employees: initialData.employees || 0,
      industry: initialData.industry || '',
    },
  });

  async function onSubmit(data: FirmographicsFormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await updateCompanyFirmographicsAction({
        companyId,
        location: data.location,
        employees: data.employees,
        industry: data.industry,
      });

      if (!result.success) {
        setError(result.error || 'Failed to update firmographics');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Alert variant="destructive" className="bg-yellow-50 text-yellow-900 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-900" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Changing these fields will update the shared Company record across all deals (historical and future).
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. New York, NY" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="employees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employees</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Software" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
