
import { SourcingTargetDTO, UniverseListDTO, GetUniverseParams } from '../types';

export async function fetchSourcingUniverse(params: GetUniverseParams): Promise<UniverseListDTO> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const allTargets: SourcingTargetDTO[] = Array.from({ length: 50 }, (_, i) => ({
    id: `target-${i}`,
    name: `Company ${i + 1}`,
    domain: `company${i + 1}.com`,
    status: i % 5 === 0 ? 'IN_SEQUENCE' : i % 7 === 0 ? 'REPLIED' : i % 10 === 0 ? 'ARCHIVED' : 'UNTOUCHED',
    addedRelative: `${(i % 30) + 1} days ago`,
  }));

  let filtered = [...allTargets];

  if (params.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(
      (t) => t.name.toLowerCase().includes(search) || t.domain.toLowerCase().includes(search)
    );
  }

  if (params.status) {
    filtered = filtered.filter((t) => t.status === params.status);
  }

  const page = params.page || 1;
  const limit = params.limit || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = filtered.slice(start, end);

  return {
    data,
    meta: {
      totalCount: filtered.length,
      currentPage: page,
      totalPages: Math.ceil(filtered.length / limit),
    },
  };
}
