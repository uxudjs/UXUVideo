import type { DeploymentProvider } from '@/lib/config/deployment';

export type { DeploymentProvider } from '@/lib/config/deployment';

export interface RuntimeFeatures {
  deploymentProvider: DeploymentProvider;
  deploymentProviderLabel: string;
  restrictedManagedDeployment: boolean;
  mediaProxyEnabled: boolean;
  iptvEnabled: boolean;
  restrictionSummary: string | null;
}

function getRestrictedFeatures(
  deploymentProvider: DeploymentProvider,
  deploymentProviderLabel: string
): RuntimeFeatures {
  return {
    deploymentProvider,
    deploymentProviderLabel,
    restrictedManagedDeployment: true,
    mediaProxyEnabled: false,
    iptvEnabled: false,
    restrictionSummary: `${deploymentProviderLabel} 托管部署会启用合规模式：关闭外部媒体代理、热链转发和 IPTV 流中继。需要这些能力时请改用传统 Node.js 自托管。`,
  };
}

export function getRuntimeFeaturesForProvider(deploymentProvider: DeploymentProvider): RuntimeFeatures {
  if (deploymentProvider === 'unsupported-cloudflare') {
    return {
      deploymentProvider,
      deploymentProviderLabel: 'Cloudflare（不支持）',
      restrictedManagedDeployment: true,
      mediaProxyEnabled: false,
      iptvEnabled: false,
      restrictionSummary: '本仓库不支持 Cloudflare Workers 或 Pages 直接部署；媒体代理和 IPTV 已关闭。',
    };
  }

  if (deploymentProvider === 'vercel') {
    return getRestrictedFeatures('vercel', 'Vercel');
  }

  return {
    deploymentProvider: 'self-hosted',
    deploymentProviderLabel: '自托管',
    restrictedManagedDeployment: false,
    mediaProxyEnabled: true,
    iptvEnabled: true,
    restrictionSummary: null,
  };
}

