import { clearSession, createLogoutUrl } from '../../../lib/auth';

export async function POST() {
  const logoutUrl = await createLogoutUrl();
  await clearSession();
  return Response.redirect(logoutUrl, 303);
}
