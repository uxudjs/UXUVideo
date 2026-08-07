export function getRuntimeEnvValue(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}
