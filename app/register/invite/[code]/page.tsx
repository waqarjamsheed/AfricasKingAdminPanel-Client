import RegisterClient from '../../RegisterClient';
import { normalizeRegistrationAccessCode } from '@/lib/registration';

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default async function InviteRegisterPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const sp = searchParams ? await searchParams : {};
  const ref = typeof sp.ref === 'string' ? sp.ref : '';
  const normalizedCode = normalizeRegistrationAccessCode(code);
  const initialRef = typeof ref === 'string' && ref ? ref : normalizedCode;

  return (
    <RegisterClient
      initialRef={initialRef}
      registrationAllowed={true}
      registrationAccessCode={normalizedCode}
    />
  );
}
