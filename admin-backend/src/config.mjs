import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) return [];
    return [[match[1], match[2].replace(/^['"]|['"]$/g, '')]];
  }));
}

const fileValues = {};
for (const file of [path.join(root, 'prototype', '.env'), path.join(root, 'backend', '.env'), path.join(root, 'admin-backend', '.env')]) {
  for (const [key, value] of Object.entries(readEnvFile(file))) if (value) fileValues[key] = value;
}
const env = (name) => process.env[name] || fileValues[name] || '';

export const config = {
  port: Number(env('ADMIN_API_PORT') || env('API_PORT') || 4180),
  nodeEnv: env('NODE_ENV') || 'development',
  supabaseUrl: (env('SUPABASE_URL') || env('EXPO_PUBLIC_SUPABASE_URL')).replace(/\/+$/, ''),
  anonKey: env('SUPABASE_ANON_KEY') || env('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY') || env('EXPO_SUPABASE_SERVICE_ROLE_KEY'),
  allowedOrigin: env('ADMIN_ALLOWED_ORIGIN') || '*',
};

export function assertConfig() {
  const missing = ['supabaseUrl', 'anonKey', 'serviceRoleKey'].filter((key) => !config[key]);
  if (missing.length) throw new Error(`Admin backend is not configured. Missing: ${missing.join(', ')}.`);
}
