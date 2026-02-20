import { redirect } from 'next/navigation';

export default function RootPage() {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    redirect('/searcher/dashboard');
  }
  redirect('/login');
}
