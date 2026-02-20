import { redirect } from 'next/navigation';

export default function LoginPage() {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    redirect('/searcher/dashboard');
  }
  return <h1>Login</h1>;
}
