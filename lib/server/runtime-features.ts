import 'server-only';

import {
  getRuntimeFeaturesForProvider,
  type RuntimeFeatures,
} from '@/lib/config/runtime-features';
import { getDeploymentProvider } from '@/lib/config/deployment';

export function getRuntimeFeatures(): RuntimeFeatures {
  return getRuntimeFeaturesForProvider(getDeploymentProvider());
}
