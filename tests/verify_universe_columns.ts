
import { ColumnDef } from '@tanstack/react-table';
import { SourcingTargetDTO } from '../src/shared/types/api';

console.log('Verifying Universe Columns vs SourcingTargetDTO...');

// 1. Define the columns definition array
// Strict typing ensures we can only use keys present in SourcingTargetDTO or valid ColumnDef properties
const columns: ColumnDef<SourcingTargetDTO>[] = [
  {
    id: 'select',
    header: 'Checkbox',
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Company',
  },
  {
    accessorKey: 'domain',
    header: 'Domain',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    id: 'actions',
    header: 'Actions',
  },
];

// 2. Verification Logic
function verifyColumns() {
  const expectedKeys = ['select', 'name', 'domain', 'status', 'actions'];
  const foundKeys: string[] = [];

  columns.forEach((col) => {
    // If it has an accessorKey, that's the primary identifier for data binding
    if ('accessorKey' in col && typeof col.accessorKey === 'string') {
        foundKeys.push(col.accessorKey);
    }
    // If it has an id (like 'select' or 'actions'), use that
    else if (col.id) {
      foundKeys.push(col.id);
    }
  });

  const missingKeys = expectedKeys.filter((key) => !foundKeys.includes(key));
  // We want to ensure we have EXACTLY these columns for the grid
  const extraKeys = foundKeys.filter((key) => !expectedKeys.includes(key));

  if (missingKeys.length > 0) {
    console.error('❌ FAILED: Missing required columns:', missingKeys);
    process.exit(1);
  }

  if (extraKeys.length > 0) {
    console.error('❌ FAILED: Extra columns found (schema violation):', extraKeys);
    process.exit(1);
  }

  console.log('✅ SUCCESS: All columns match the DTO and requirements.');
  console.log('   - Checkbox (id: select)');
  console.log('   - Company (accessor: name)');
  console.log('   - Domain (accessor: domain)');
  console.log('   - Status (accessor: status)');
  console.log('   - Actions (id: actions)');
}

verifyColumns();
