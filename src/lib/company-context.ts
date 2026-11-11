import { ACTIVE_COMPANY_COOKIE, getAuthContext } from '@/lib/auth';

export { ACTIVE_COMPANY_COOKIE };

export async function getActiveCompanyId(): Promise<string> {
  try {
    const auth = await getAuthContext();
    if (auth?.activeCompanyId) {
      return auth.activeCompanyId;
    }
  } catch {
    // Unauthenticated or outside request scope
  }
  return '';
}
