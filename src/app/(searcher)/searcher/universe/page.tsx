
import { Suspense } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { SourcingDataTable } from '@/features/sourcing/components/sourcing-data-table';
import { CsvUploadModal } from '@/features/sourcing/components/csv-upload-modal';

export default function SearcherUniversePage() {
  return (
    <div className="flex flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-8">
          <h1 className="text-2xl font-bold tracking-tight">Sourcing Universe</h1>
          <div className="flex items-center space-x-2">
            <CsvUploadModal>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </CsvUploadModal>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Suspense fallback={<div>Loading...</div>}>
          <SourcingDataTable />
        </Suspense>
      </div>
    </div>
  );
}
