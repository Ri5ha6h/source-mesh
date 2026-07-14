import { createAuthorizationUrl } from '../../../lib/auth';

export async function GET() {
  return Response.redirect(await createAuthorizationUrl());
}
