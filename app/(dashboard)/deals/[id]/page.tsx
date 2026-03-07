export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <h1>Deal {id}</h1>
    </main>
  );
}
