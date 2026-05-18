import RegisterClient from './RegisterClient';
import { normalizeRegistrationAccessCode } from '@/lib/registration';

export default async function RegisterPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = searchParams ? await searchParams : {};
  const ref = typeof sp.ref === 'string' ? sp.ref : '';
  const normalizedRef = normalizeRegistrationAccessCode(ref);
  return <RegisterClient initialRef={normalizedRef} registrationAllowed={false} registrationAccessCode={normalizedRef} />;
}
