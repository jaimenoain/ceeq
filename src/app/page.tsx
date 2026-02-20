import { redirect } from 'next/navigation';
import { getRedirectPath } from '@/shared/lib/auth-utils';

export default function RootPage() {
  redirect(getRedirectPath());
}
