const WORKER_VERSION = '1.0.0';
const API_CONTRACT_VERSION = '1';
const PAGES_VERSION = 'unavailable';

const ROUTES = [
  { id: 'app-update', pattern: /^\/api\/app-update$/, methods: ['GET'] },
  { id: 'auth-account', pattern: /^\/api\/auth\/accounts\/[^/]+$/, methods: ['PATCH', 'DELETE'] },
  { id: 'auth-accounts', pattern: /^\/api\/auth\/accounts$/, methods: ['GET', 'POST'] },
  { id: 'auth', pattern: /^\/api\/auth$/, methods: ['GET', 'POST'] },
  { id: 'auth-session', pattern: /^\/api\/auth\/session$/, methods: ['GET', 'DELETE'] },
  { id: 'config', pattern: /^\/api\/config$/, methods: ['GET'] },
  { id: 'danmaku', pattern: /^\/api\/danmaku$/, methods: ['GET', 'OPTIONS'] },
  { id: 'detail', pattern: /^\/api\/detail$/, methods: ['GET', 'POST'] },
  { id: 'douban-image', pattern: /^\/api\/douban\/image$/, methods: ['GET'] },
  { id: 'douban-recommend', pattern: /^\/api\/douban\/recommend$/, methods: ['GET'] },
  { id: 'douban-tags', pattern: /^\/api\/douban\/tags$/, methods: ['GET'] },
  { id: 'iptv', pattern: /^\/api\/iptv$/, methods: ['GET'] },
  { id: 'iptv-stream', pattern: /^\/api\/iptv\/stream$/, methods: ['GET', 'OPTIONS'] },
  { id: 'ping', pattern: /^\/api\/ping$/, methods: ['POST'] },
  { id: 'premium-category', pattern: /^\/api\/premium\/category$/, methods: ['GET', 'POST'] },
  { id: 'premium-types', pattern: /^\/api\/premium\/types$/, methods: ['GET', 'POST'] },
  { id: 'probe-resolution', pattern: /^\/api\/probe-resolution$/, methods: ['POST'], sse: true },
  { id: 'proxy', pattern: /^\/api\/proxy$/, methods: ['GET', 'OPTIONS'] },
  { id: 'search-parallel', pattern: /^\/api\/search-parallel$/, methods: ['POST'], sse: true },
  { id: 'user-config', pattern: /^\/api\/user\/config$/, methods: ['GET', 'POST'] },
  { id: 'user-sync', pattern: /^\/api\/user\/sync$/, methods: ['GET', 'POST'] },
  { id: 'admin-usage', pattern: /^\/api\/admin\/usage$/, methods: ['GET'] },
];

function normalizePath(pathname) {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '') || '/';
}

function responseHeaders(requestId, contentType, allow) {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
    'X-Request-Id': requestId,
    'X-UXUV-Worker-Version': WORKER_VERSION,
    'X-UXUV-Pages-Version': PAGES_VERSION,
    'X-UXUV-API-Contract': API_CONTRACT_VERSION,
  });
  if (allow) headers.set('Allow', allow);
  return headers;
}

function errorResponse({ requestId, status, code, message, sse = false, allow, head = false }) {
  const payload = JSON.stringify({
    error: { code, message, requestId, details: null },
  });
  const contentType = sse
    ? 'text/event-stream; charset=utf-8'
    : 'application/json; charset=utf-8';
  const body = head ? null : sse ? `event: error\ndata: ${payload}\n\n` : payload;
  return new Response(body, {
    status,
    headers: responseHeaders(requestId, contentType, allow),
  });
}

function routeRequest(request, requestId) {
  const method = request.method.toUpperCase();
  const path = normalizePath(new URL(request.url).pathname);
  const isApi = path === '/api' || path.startsWith('/api/');

  if (isApi) {
    const route = ROUTES.find((candidate) => candidate.pattern.test(path));
    if (!route) {
      return {
        routeId: 'api.unknown',
        errorCode: 'API_ROUTE_NOT_FOUND',
        response: errorResponse({
          requestId,
          status: 404,
          code: 'API_ROUTE_NOT_FOUND',
          message: 'API route not found.',
          head: method === 'HEAD',
        }),
      };
    }

    if (!route.methods.includes(method)) {
      return {
        routeId: route.id,
        errorCode: 'METHOD_NOT_ALLOWED',
        response: errorResponse({
          requestId,
          status: 405,
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed for this route.',
          sse: route.sse,
          allow: route.methods.join(', '),
          head: method === 'HEAD',
        }),
      };
    }

    return {
      routeId: route.id,
      errorCode: 'ROUTE_NOT_IMPLEMENTED',
      response: errorResponse({
        requestId,
        status: 501,
        code: 'ROUTE_NOT_IMPLEMENTED',
        message: 'This API route is not implemented yet.',
        sse: route.sse,
      }),
    };
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return {
      routeId: 'pages',
      errorCode: 'METHOD_NOT_ALLOWED',
      response: errorResponse({
        requestId,
        status: 405,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Static pages only support GET and HEAD.',
        allow: 'GET, HEAD',
      }),
    };
  }

  return {
    routeId: 'pages',
    errorCode: 'FRONTEND_NOT_READY',
    response: errorResponse({
      requestId,
      status: 503,
      code: 'FRONTEND_NOT_READY',
      message: 'The fixed frontend release is not configured yet.',
      head: method === 'HEAD',
    }),
  };
}

function logCompletion(request, response, requestId, routeId, errorCode, startedAt) {
  console.log(JSON.stringify({
    event: 'request.complete',
    requestId,
    routeId,
    method: request.method.toUpperCase(),
    status: response.status,
    durationMs: Math.max(0, Date.now() - startedAt),
    workerVersion: WORKER_VERSION,
    pagesVersion: PAGES_VERSION,
    apiContract: API_CONTRACT_VERSION,
    cacheStatus: 'bypass',
    upstreamClass: null,
    errorCode,
  }));
}

async function fetch(request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  let result;

  try {
    result = routeRequest(request, requestId);
  } catch {
    result = {
      routeId: 'request',
      errorCode: 'INTERNAL_ERROR',
      response: errorResponse({
        requestId,
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'The request could not be processed.',
      }),
    };
  }

  logCompletion(request, result.response, requestId, result.routeId, result.errorCode, startedAt);
  return result.response;
}

const worker = { fetch };

export default worker;
