import {createRemoteJWKSet, jwtVerify} from 'jose';

const keySets = new Map();
export const accessEnabled = env => env.AUTH_MODE === 'access';
export function accessSettings(env) {
  const issuer = String(env.ACCESS_TEAM_DOMAIN || '').replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) ||
      !env.ACCESS_AUD || env.ADMIN_EMAIL !== 'becksfcmarghera@gmail.com') return null;
  return {issuer, audience: env.ACCESS_AUD};
}
export async function verifyAccess(request, env, resolver) {
  const settings = accessSettings(env);
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!settings || !token || token.length > 16384) return false;
  try {
    let keys = resolver || keySets.get(settings.issuer);
    if (!keys) {
      keys = createRemoteJWKSet(new URL(settings.issuer + '/cdn-cgi/access/certs'), {timeoutDuration: 5000});
      keySets.set(settings.issuer, keys);
    }
    const {payload} = await jwtVerify(token, keys, {...settings, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub', 'email']});
    return payload.email === env.ADMIN_EMAIL;
  } catch { return false; }
}
