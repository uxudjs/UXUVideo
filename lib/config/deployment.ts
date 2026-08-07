type EnvLike = Record<string, string | undefined>;

export type DeploymentProvider = 'self-hosted' | 'vercel' | 'unsupported-cloudflare';

export function isVercelDeployment(env: EnvLike = process.env): boolean {
  return env.VERCEL === '1' || Boolean(env.VERCEL_ENV);
}

export function isCloudflareDeployment(env: EnvLike = process.env): boolean {
  return env.CF_PAGES === '1' || Boolean(env.CF_PAGES_URL) || Boolean(env.WORKERS_CI);
}

export function getDeploymentProvider(env: EnvLike = process.env): DeploymentProvider {
  if (isCloudflareDeployment(env)) return 'unsupported-cloudflare';
  if (isVercelDeployment(env)) return 'vercel';
  return 'self-hosted';
}

export function shouldEnableVercelAnalytics(env: EnvLike = process.env): boolean {
  return getDeploymentProvider(env) === 'vercel';
}
