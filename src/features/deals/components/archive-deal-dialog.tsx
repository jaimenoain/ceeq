'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

export const LOSS_REASONS = [
  'Price too high',
  'Legal issues',
  'Owner withdrew',
  'Business quality',
  'Timing',
  'Other',
] as const;

const ArchiveDealSchema = z.object({
  lossReason: z.enum(LOSS_REASONS, {
    required_error: 'Please select a reason for archiving this deal.',
  }),
});

export type ArchiveDealFormValues = z.infer<typeof ArchiveDealSchema>;

export interface ArchiveDealPayload {
  dealId: string;
  lossReason: string;
}

interface ArchiveDealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  onSubmit: (payload: ArchiveDealPayload) => void;
}

export function ArchiveDealDialog({
  isOpen,
  onClose,
  dealId,
  onSubmit,
}: ArchiveDealDialogProps) {
  const form = useForm<ArchiveDealFormValues>({
    resolver: zodResolver(ArchiveDealSchema),
  });

  const handleSubmit = (values: ArchiveDealFormValues) => {
    onSubmit({
      dealId,
      lossReason: values.lossReason,
    });
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Archive Deal</DialogTitle>
          <DialogDescription>
            This action will move the deal to the archives. Please select a reason for this loss.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="lossReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loss Reason</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOSS_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Archive Deal</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
