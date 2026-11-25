import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, platform, arch, cpus } from 'node:os';
import { join } from 'node:path';
import { fixtures } from '../shared/fixtures';
import { sampleDraft } from '../shared/sample';
import { checkDraft } from './checks';
import { createApp } from './app';

async function main() {
  let expected = 0,
    caught = 0,
    falsePositives = 0;
  for (const fixture of fixtures) {
    const remaining = fixture.expected.map((f) => JSON.stringify(f));
    expected += remaining.length;
    for (const { rule, context } of checkDraft(fixture.draft)) {
      const index = remaining.indexOf(JSON.stringify({ rule, context }));
      if (index >= 0) {
        caught++;
        remaining.splice(index, 1);
      } else falsePositives++;
    }
  }
  console.log(
    JSON.stringify(
      {
        fixtureDrafts: fixtures.length,
        expectedFindings: expected,
        caught,
        missed: expected - caught,
        falsePositives,
        fixtureRecallPercent: (caught / expected) * 100,
      },
      null,
      2,
    ),
  );
  const directory = mkdtempSync(join(tmpdir(), 'content-qa-metrics-'));
  process.env.DB_PATH = join(directory, 'reports.sqlite');
  const app = await createApp();
  try {
    await app.listen(0, '127.0.0.1');
    const url = `${await app.getUrl()}/api/reports`;
    const body = JSON.stringify(sampleDraft);
    const timings: number[] = [];
    for (let index = 0; index < 35; index++) {
      const start = performance.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (response.status !== 201)
        throw new Error(`Unexpected HTTP ${response.status}`);
      await response.json();
      if (index >= 5) timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    console.log(
      JSON.stringify(
        {
          runs: 30,
          warmup: 5,
          medianMs: Number(((timings[14] + timings[15]) / 2).toFixed(2)),
          htmlBytes: Buffer.byteLength(sampleDraft.html),
          requestBytes: Buffer.byteLength(body),
          node: process.version,
          os: `${platform()} ${arch()}`,
          cpu: cpus()[0]?.model,
          storage:
            'Temporary file-backed SQLite; sequential loopback HTTP POST including parsing and saving',
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
  if (caught !== expected || falsePositives) process.exitCode = 1;
}
void main();
