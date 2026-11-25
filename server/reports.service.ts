import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Draft, Finding, Report, ReportSummary } from '../shared/types';
import { checkDraft } from './checks';

interface ReportRow {
  id: number;
  title: string;
  meta_description: string;
  html: string;
  created_at: string;
  findings_json: string;
}

@Injectable()
export class ReportsService implements OnModuleDestroy {
  private readonly db: DatabaseSync;
  constructor() {
    const path = process.env.DB_PATH || resolve('data/reports.sqlite');
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      meta_description TEXT NOT NULL, html TEXT NOT NULL,
      created_at TEXT NOT NULL, findings_json TEXT NOT NULL, finding_count INTEGER NOT NULL
    )`);
  }

  create(draft: Draft): Report {
    const findings = checkDraft(draft);
    const createdAt = new Date().toISOString();
    const result = this.db
      .prepare(
        `
      INSERT INTO reports (title, meta_description, html, created_at, findings_json, finding_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        draft.title,
        draft.metaDescription,
        draft.html,
        createdAt,
        JSON.stringify(findings),
        findings.length,
      );
    return {
      ...draft,
      id: Number(result.lastInsertRowid),
      createdAt,
      findings,
    };
  }

  list(): ReportSummary[] {
    return this.db
      .prepare(
        `SELECT id, title, created_at AS createdAt, finding_count AS findingCount
      FROM reports ORDER BY id DESC LIMIT 20`,
      )
      .all() as unknown as ReportSummary[];
  }

  get(id: number): Report {
    const row = this.db
      .prepare('SELECT * FROM reports WHERE id = ?')
      .get(id) as unknown as ReportRow | undefined;
    if (!row) throw new NotFoundException('Report not found.');
    return {
      id: row.id,
      title: row.title,
      metaDescription: row.meta_description,
      html: row.html,
      createdAt: row.created_at,
      findings: JSON.parse(row.findings_json) as Finding[],
    };
  }
  onModuleDestroy() {
    this.db.close();
  }
}
