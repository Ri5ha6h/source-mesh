import { applicationOrigin, exchangeAuthorizationCode } from '../../../lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = applicationOrigin();
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return Response.redirect(`${origin}/login?reason=failed`);
  try {
    await exchangeAuthorizationCode(code, state);
    return Response.redirect(`${origin}/app`);
  } catch {
    return Response.redirect(`${origin}/login?reason=failed`);
  }
}
