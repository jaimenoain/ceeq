'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, X, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useToast } from '@/shared/hooks/use-toast';
import { uploadSourcingCsvAction } from '@/features/sourcing/actions';

interface CsvUploadModalProps {
  children?: React.ReactNode;
}

export function CsvUploadModal({ children }: CsvUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  // Mapping state: dbField -> csvHeader
  const [fieldMapping, setFieldMapping] = useState<{
    name?: string;
    domain?: string;
    industry?: string;
  }>({});
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFieldMapping({});

      // Parse headers
      Papa.parse(selectedFile, {
        preview: 1, // Read only the first row
        header: false,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const firstRow = results.data[0] as string[];
            // Filter out empty headers and trim
            const extractedHeaders = firstRow
                .map(h => h ? h.trim() : '')
                .filter(h => h !== '');
            setHeaders(extractedHeaders);

            // Auto-map if headers match exactly (case-insensitive)
            const newMapping: typeof fieldMapping = {};
            extractedHeaders.forEach(header => {
                const lower = header.toLowerCase();
                if (lower === 'name' || lower === 'company' || lower === 'company name') newMapping.name = header;
                if (lower === 'domain' || lower === 'website' || lower === 'url') newMapping.domain = header;
                if (lower === 'industry' || lower === 'sector') newMapping.industry = header;
            });
            setFieldMapping(newMapping);
          }
        },
        error: (err) => {
          console.error('Error parsing CSV headers:', err);
          toast({
            variant: 'destructive',
            title: 'Error reading file',
            description: 'Could not parse CSV headers.',
          });
        }
      });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setHeaders([]);
    setFieldMapping({});
    // Reset the input value if needed, but since we replace the input when !file, it's fine.
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Invert mapping for the server action: csvHeader -> dbField
      const mappingConfig: Record<string, string> = {};
      if (fieldMapping.name) mappingConfig[fieldMapping.name] = 'name';
      if (fieldMapping.domain) mappingConfig[fieldMapping.domain] = 'domain';
      if (fieldMapping.industry) mappingConfig[fieldMapping.industry] = 'industry';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('mappingConfig', JSON.stringify(mappingConfig));

      const result = await uploadSourcingCsvAction(formData);

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: result.error,
        });
      } else {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${result.successCount} targets. Skipped ${result.skippedCount} duplicates.`,
        });
        queryClient.invalidateQueries({ queryKey: ['sourcing-universe'] });
        setIsOpen(false);
        setFile(null);
        setHeaders([]);
        setFieldMapping({});
      }
    } catch (error) {
       console.error("Upload error:", error);
       toast({
        variant: 'destructive',
        title: 'Unexpected Error',
        description: 'An unexpected error occurred during upload.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const canSubmit = file && fieldMapping.name && fieldMapping.domain && !isUploading;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!isUploading) setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Sourcing Targets</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import targets. You must map Name and Domain columns.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {!file ? (
            <div className="flex flex-col items-center justify-center w-full">
              <Label
                htmlFor="csv-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                   <FileText className="w-8 h-8 mb-2 text-muted-foreground" />
                   <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                   <p className="text-xs text-muted-foreground">CSV (MAX. 10MB)</p>
                </div>
                <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                />
              </Label>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between rounded-md border p-3 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleRemoveFile} disabled={isUploading}>
                    <X className="h-4 w-4" />
                  </Button>
               </div>

               <div className="space-y-4">
                 <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-xs">Map Columns</h4>
                 <div className="grid gap-4">
                    {/* Name Mapping */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right col-span-1">Name <span className="text-destructive">*</span></Label>
                      <Select
                        value={fieldMapping.name}
                        onValueChange={(val) => setFieldMapping(prev => ({ ...prev, name: val }))}
                        disabled={isUploading}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Domain Mapping */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right col-span-1">Domain <span className="text-destructive">*</span></Label>
                      <Select
                        value={fieldMapping.domain}
                        onValueChange={(val) => setFieldMapping(prev => ({ ...prev, domain: val }))}
                        disabled={isUploading}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Industry Mapping */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right col-span-1">Industry</Label>
                      <Select
                        value={fieldMapping.industry}
                        onValueChange={(val) => setFieldMapping(prev => ({ ...prev, industry: val }))}
                        disabled={isUploading}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Importing...' : 'Import Targets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
