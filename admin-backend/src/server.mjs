import http from 'node:http';
import { config, assertConfig } from './config.mjs';
import { authenticate, bearer, refreshSession, sendOtp, signOut, verifyOtp } from './auth.mjs';
import { asHttpError, HttpError } from './errors.mjs';
import { requireRole } from './permissions.mjs';
import * as repo from './repository.mjs';
import { serveStatic } from './static.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const adminWebRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../admin-web/dist');

function writeJson(response, status, payload) {
  response.writeHead(status, { ...jsonHeaders, 'Access-Control-Allow-Origin': config.allowedOrigin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' });
  response.end(JSON.stringify(payload));
}

async function bodyOf(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new HttpError(413, 'Request body is too large.', 'BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Request body must be valid JSON.', 'INVALID_JSON'); }
}

async function contextOf(request) {
  return authenticate(bearer(request.headers));
}

function idFrom(pathname, pattern) {
  const match = pathname.match(pattern);
  return match?.[1] || null;
}

async function route(request, pathname, searchParams) {
  const method = request.method || 'GET';
  if (method === 'OPTIONS') return { status: 204, payload: null };
  if (pathname === '/healthz' && method === 'GET') return { status: 200, payload: { status: 'ok', service: 'admin-backend', checkedAt: new Date().toISOString() } };
  if (pathname === '/readyz' && method === 'GET') return { status: 200, payload: await repo.health() };
  if (pathname === '/v1/auth/otp' && method === 'POST') return { status: 200, payload: await sendOtp((await bodyOf(request)).email) };
  if (pathname === '/v1/auth/verify' && method === 'POST') { const body = await bodyOf(request); return { status: 200, payload: await verifyOtp(body.email, body.code || body.token) }; }
  if (pathname === '/v1/auth/refresh' && method === 'POST') return { status: 200, payload: await refreshSession((await bodyOf(request)).refreshToken) };
  if (pathname === '/v1/auth/logout' && method === 'POST') { await signOut(bearer(request.headers)); return { status: 204, payload: null }; }

  const context = await contextOf(request);
  if (pathname === '/v1/me' && method === 'GET') return { status: 200, payload: context };
  if (pathname === '/v1/dashboard' && method === 'GET') return { status: 200, payload: await repo.dashboard(context) };
  if (pathname === '/v1/search' && method === 'GET') return { status: 200, payload: await repo.search(context, searchParams) };
  if (pathname === '/v1/health' && method === 'GET') { requireRole(context, ['super_admin']); return { status: 200, payload: await repo.health() }; }
  if (pathname === '/v1/posts' && method === 'GET') return { status: 200, payload: await repo.listPosts(context, searchParams) };
  if (pathname === '/v1/posts' && method === 'POST') return { status: 201, payload: await repo.createPost(context, await bodyOf(request)) };
  const postStatusId = idFrom(pathname, /^\/v1\/posts\/([^/]+)\/status$/);
  if (postStatusId && method === 'PATCH') return { status: 200, payload: await repo.updatePostStatus(context, postStatusId, (await bodyOf(request)).status) };
  if (pathname === '/v1/moderation' && method === 'GET') return { status: 200, payload: await repo.listModeration(context, searchParams) };
  const moderationId = idFrom(pathname, /^\/v1\/moderation\/([^/]+)$/);
  if (moderationId && method === 'PATCH') return { status: 200, payload: await repo.applyModeration(context, moderationId, await bodyOf(request)) };
  if (pathname === '/v1/events' && method === 'GET') return { status: 200, payload: await repo.listEvents(context, searchParams) };
  if (pathname === '/v1/events' && method === 'POST') return { status: 201, payload: await repo.createEvent(context, await bodyOf(request)) };
  const eventStatusId = idFrom(pathname, /^\/v1\/events\/([^/]+)\/status$/);
  if (eventStatusId && method === 'PATCH') return { status: 200, payload: await repo.updateEventStatus(context, eventStatusId, (await bodyOf(request)).status) };
  if (pathname === '/v1/registrations' && method === 'GET') return { status: 200, payload: await repo.listRegistrations(context, searchParams) };
  if (pathname === '/v1/staff' && method === 'GET') return { status: 200, payload: await repo.listStaff(context, searchParams) };
  if (pathname === '/v1/staff/invite' && method === 'POST') return { status: 201, payload: await repo.inviteStaff(context, await bodyOf(request)) };
  const staffId = idFrom(pathname, /^\/v1\/staff\/([^/]+)$/);
  if (staffId && method === 'DELETE') return { status: 200, payload: await repo.revokeStaff(context, staffId) };
  if (pathname === '/v1/campuses' && method === 'GET') return { status: 200, payload: await repo.listCampuses(context, searchParams) };
  if (pathname === '/v1/campuses' && method === 'POST') return { status: 201, payload: await repo.createCampus(context, await bodyOf(request)) };
  const campusStatusId = idFrom(pathname, /^\/v1\/campuses\/([^/]+)\/status$/);
  if (campusStatusId && method === 'PATCH') return { status: 200, payload: await repo.updateCampus(context, campusStatusId, await bodyOf(request)) };
  const campusId = idFrom(pathname, /^\/v1\/campuses\/([^/]+)$/);
  if (campusId && method === 'PATCH') return { status: 200, payload: await repo.updateCampus(context, campusId, await bodyOf(request)) };
  if (campusId && method === 'DELETE') return { status: 200, payload: await repo.deleteCampus(context, campusId) };
  if (pathname === '/v1/notifications' && method === 'GET') return { status: 200, payload: await repo.listNotifications(context, searchParams) };
  if (pathname === '/v1/notifications/read-all' && method === 'POST') return { status: 200, payload: await repo.markAllNotifications(context) };
  const notificationId = idFrom(pathname, /^\/v1\/notifications\/([^/]+)\/read$/);
  if (notificationId && method === 'POST') return { status: 200, payload: await repo.markNotification(context, notificationId) };
  if (pathname === '/v1/audit' && method === 'GET') return { status: 200, payload: await repo.listAudit(context, searchParams) };
  if (pathname === '/v1/settings' && method === 'GET') return { status: 200, payload: await repo.getSettings(context) };
  if (pathname === '/v1/settings' && method === 'PATCH') return { status: 200, payload: await repo.saveSettings(context, await bodyOf(request)) };
  throw new HttpError(404, 'Admin API route not found.', 'ROUTE_NOT_FOUND');
}

assertConfig();
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname !== '/v1' && !url.pathname.startsWith('/v1/') && !['/healthz', '/readyz'].includes(url.pathname)) {
      if (serveStatic(adminWebRoot, request, response, url.pathname)) return;
      throw new HttpError(404, 'Admin web asset not found.', 'STATIC_NOT_FOUND');
    }
    const result = await route(request, url.pathname, url.searchParams);
    if (result.status === 204) { response.writeHead(204, { 'Access-Control-Allow-Origin': config.allowedOrigin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' }); response.end(); return; }
    writeJson(response, result.status, result.payload);
  } catch (error) {
    const failure = asHttpError(error);
    if (failure.status >= 500) console.error(`[admin-backend] ${failure.code}: ${failure.message}`);
    writeJson(response, failure.status, { error: { code: failure.code, message: failure.message, details: failure.details } });
  }
});

server.listen(config.port, '0.0.0.0', () => console.log(`CampusSphere admin-backend listening on ${config.port}`));
