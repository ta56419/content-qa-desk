import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app';
import { sampleDraft } from '../shared/sample';
import type { Report, ReportSummary } from '../shared/types';

describe('REST API and disk persistence (integration)', () => {
  const directory = mkdtempSync(join(tmpdir(), 'content-qa-test-'));
  let app: Awaited<ReturnType<typeof createApp>>;
  let url: string;
  let saved: Report;
  const post = (body: unknown) =>
    fetch(`${url}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  before(async () => {
    process.env.DB_PATH = join(directory, 'reports.sqlite');
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  after(async () => {
    await app.close();
    delete process.env.DB_PATH;
    rmSync(directory, { recursive: true, force: true });
  });
  it('runs checks and saves a draft snapshot', async () => {
    const response = await post(sampleDraft);
    assert.equal(response.status, 201);
    saved = (await response.json()) as Report;
    assert.equal(saved.findings.length, 3);
    assert.equal(saved.html, sampleDraft.html);
  });
  it('saves a correction separately and lists newest first', async () => {
    const response = await post({
      ...sampleDraft,
      metaDescription: 'A practical Monday review for a small editorial team.',
    });
    const corrected = (await response.json()) as Report;
    assert.equal(corrected.findings.length, 2);
    const list = (await (
      await fetch(`${url}/api/reports`)
    ).json()) as ReportSummary[];
    assert.deepEqual(
      list.map((r) => r.id),
      [corrected.id, saved.id],
    );
    const original = (await (
      await fetch(`${url}/api/reports/${saved.id}`)
    ).json()) as Report;
    assert.equal(original.metaDescription, '');
  });
  it('retains reports after restarting the API with the same SQLite file', async () => {
    await app.close();
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    assert.deepEqual(
      await (await fetch(`${url}/api/reports/${saved.id}`)).json(),
      saved,
    );
  });
  it('rejects wrong types and oversized fields; handles missing and invalid IDs', async () => {
    for (const body of [
      { ...sampleDraft, html: 42 },
      { ...sampleDraft, title: 'x'.repeat(301) },
      { ...sampleDraft, html: 'x'.repeat(100001) },
      {},
    ]) {
      assert.equal((await post(body)).status, 400);
    }
    assert.equal((await fetch(`${url}/api/reports/nope`)).status, 400);
    assert.equal((await fetch(`${url}/api/reports/999999`)).status, 404);
  });
  it('stores SQL-like strings as data and accepts empty fields for QA', async () => {
    const title = "'); DROP TABLE reports; --";
    const response = await post({ title, html: '', metaDescription: '' });
    const report = (await response.json()) as Report;
    assert.equal(report.title, title);
    assert.equal(report.findings.length, 2);
    assert.equal((await fetch(`${url}/api/reports/${saved.id}`)).status, 200);
  });
});
