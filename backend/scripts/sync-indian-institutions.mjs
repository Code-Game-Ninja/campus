import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { resolve } from 'node:path';

const SOURCE_GROUP = 'open-indian-institutions';
const DEFAULT_SOURCES = [
  {
    name: 'colleges-api-onrender',
    urls: [
      'https://colleges-api.onrender.com/',
      'https://colleges-api.onrender.com/api/institutions',
      'https://colleges-api.onrender.com/api/colleges',
      'https://colleges-api.onrender.com/colleges',
    ],
  },
  {
    name: 'indian-colleges-list',
    urls: ['https://indian-colleges-list.vercel.app/api/institutions'],
  },
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const inputArg = process.argv.slice(2).find((value) => value.startsWith('--input='));
const inputPath = inputArg ? resolve(process.cwd(), inputArg.slice('--input='.length)) : null;
const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const serviceRoleKey = process.env.CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of ['institutions', 'colleges', 'universities', 'results', 'items', 'data']) {
    const rows = extractRows(payload[key]);
    if (rows.length) return rows;
  }
  return [];
}

function keyMap(record) {
  return new Map(Object.entries(record ?? {}).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), value]));
}

function firstValue(map, aliases) {
  for (const alias of aliases) {
    const value = map.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return null;
}

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function normalizeDomain(value, website) {
  const candidate = normalizeText(value);
  if (candidate) return candidate.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  try { return website ? new URL(website).hostname.replace(/^www\./i, '').toLowerCase() : null; }
  catch { return null; }
}

function normalizeWebsite(value) {
  const website = normalizeText(value);
  if (!website) return null;
  try { return new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).toString(); }
  catch { return null; }
}

function slugify(name, suffix) {
  const base = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  return `${base || 'institution'}-${suffix.slice(0, 10)}`;
}

function normalizeRecord(record, sourceName) {
  if (!record || typeof record !== 'object') return null;
  const fields = keyMap(record);
  const name = normalizeText(firstValue(fields, [
    'name', 'college', 'college_name', 'collegeName', 'institution', 'institution_name',
    'institutionName', 'university', 'university_name', 'universityName', 'College Name', 'Institution Name',
    'institute_name', 'instituteName', 'institute'
  ]));
  if (name.length < 2) return null;

  const state = normalizeText(firstValue(fields, ['state', 'state_name', 'stateName', 'province', 'stateProvince'])) || null;
  const city = normalizeText(firstValue(fields, ['city', 'district', 'district_name', 'districtName', 'location'])) || null;
  const institutionType = normalizeText(firstValue(fields, ['type', 'college_type', 'collegeType', 'institution_type', 'institutionType', 'category'])) || null;
  const website = normalizeWebsite(firstValue(fields, ['website', 'website_url', 'websiteUrl', 'url', 'web_page', 'webPage']));
  const domain = normalizeDomain(firstValue(fields, ['domain', 'email_domain', 'emailDomain']), website);
  const sourceRecordId = firstValue(fields, ['id', '_id', 'college_id', 'collegeId', 'institution_id', 'institutionId', 'aishe_code', 'aisheCode']);
  const identity = [name, state ?? '', city ?? ''].map((value) => value.toLowerCase()).join('|');
  const fingerprint = createHash('sha256').update(identity).digest('hex').slice(0, 24);

  return {
    fingerprint,
    name,
    state,
    city,
    institutionType,
    website,
    domain,
    sources: [{ name: sourceName, recordId: sourceRecordId }],
  };
}

function mergeRecords(records) {
  const merged = new Map();
  for (const record of records) {
    if (!record) continue;
    const current = merged.get(record.fingerprint);
    if (!current) { merged.set(record.fingerprint, record); continue; }
    current.state ??= record.state;
    current.city ??= record.city;
    current.institutionType ??= record.institutionType;
    current.website ??= record.website;
    current.domain ??= record.domain;
    for (const source of record.sources) {
      if (!current.sources.some((item) => item.name === source.name && item.recordId === source.recordId)) current.sources.push(source);
    }
  }
  return [...merged.values()];
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'CampusSphere-Catalog-Sync/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) throw new Error(`expected JSON, received ${contentType || 'unknown content type'}`);
  return response.json();
}

async function fetchSource(source) {
  const errors = [];
  for (const url of source.urls) {
    try {
      const payload = await fetchJson(url);
      const rows = extractRows(payload);
      if (!rows.length) throw new Error('response contains no institution list');
      return { name: source.name, url, rows };
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.join('; '));
}

async function loadRecords() {
  if (inputPath) {
    const payload = JSON.parse(await readFile(inputPath, 'utf8'));
    return extractRows(payload).map((record) => normalizeRecord(record, 'local-input'));
  }

  const settled = await Promise.allSettled(DEFAULT_SOURCES.map(fetchSource));
  const normalized = [];
  const failures = [];
  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      failures.push(`${DEFAULT_SOURCES[index].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      return;
    }
    console.log(`Fetched ${result.value.rows.length} records from ${result.value.url}`);
    normalized.push(...result.value.rows.map((record) => normalizeRecord(record, result.value.name)));
  });
  if (failures.length) console.warn(`Source warnings:\n- ${failures.join('\n- ')}`);
  if (!normalized.some(Boolean)) throw new Error('No institution records were returned by either configured API.');
  return normalized;
}

async function upsertBatch(rows) {
  const response = await fetch(`${baseUrl}/rest/v1/campuses?on_conflict=catalog_source,catalog_source_id`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Campus upsert failed (${response.status}): ${(await response.text()).slice(0, 1000)}`);
}

const merged = mergeRecords(await loadRecords());
const syncedAt = new Date().toISOString();
const rows = merged.map((record) => ({
  name: record.name,
  slug: slugify(record.name, record.fingerprint),
  country_code: 'IN',
  timezone: 'Asia/Kolkata',
  status: 'active',
  state_province: record.state,
  city: record.city,
  institution_type: record.institutionType,
  domain: record.domain,
  website_url: record.website,
  catalog_source: SOURCE_GROUP,
  catalog_source_id: record.fingerprint,
  catalog_metadata: { sources: record.sources },
  catalog_synced_at: syncedAt,
}));

if (dryRun) {
  console.log(JSON.stringify({ valid: true, normalized: rows.length, sample: rows.slice(0, 3) }, null, 2));
  process.exit(0);
}
if (!baseUrl || !serviceRoleKey) {
  console.error('Set CAMPUSSPHERE_SUPABASE_URL and CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY before cloud sync.');
  process.exit(2);
}

for (let index = 0; index < rows.length; index += 200) await upsertBatch(rows.slice(index, index + 200));
console.log(`Upserted ${rows.length} deduplicated Indian colleges/universities into public.campuses.`);
