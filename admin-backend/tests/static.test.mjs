import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { serveStatic } from '../src/static.mjs';

function responseCapture() {
  return {
    status: null,
    headers: null,
    ended: false,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end() { this.ended = true; },
  };
}

test('serves the SPA entry point for a client-side route', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campussphere-static-'));
  try {
    fs.writeFileSync(path.join(root, 'index.html'), '<div id="root"></div>');
    const response = responseCapture();
    assert.equal(serveStatic(root, { method: 'HEAD' }, response, '/dashboard'), true);
    assert.equal(response.status, 200);
    assert.match(response.headers['Content-Type'], /text\/html/);
    assert.equal(response.ended, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('does not fall back to the SPA for a missing asset', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campussphere-static-'));
  try {
    fs.writeFileSync(path.join(root, 'index.html'), '<div id="root"></div>');
    assert.equal(serveStatic(root, { method: 'HEAD' }, responseCapture(), '/favicon.ico'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('rejects traversal outside the static root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campussphere-static-'));
  try {
    fs.writeFileSync(path.join(root, 'index.html'), '<div id="root"></div>');
    assert.equal(serveStatic(root, { method: 'HEAD' }, responseCapture(), '/../secret.txt'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
