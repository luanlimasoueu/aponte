// Small async SQL layer: SQLite (node:sqlite) locally, PostgreSQL when DATABASE_URL is set.
// Queries are written once with `?` placeholders and SQLite-style datetime('now').
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

export type Row = Record<string, unknown>;
export type RunResult = { lastInsertRowid: number; changes: number };
export type Param = string | number | null | undefined;

export interface Driver {
  dialect: "sqlite" | "postgres";
  get(sql: string, params: Param[]): Promise<Row | undefined>;
  all(sql: string, params: Param[]): Promise<Row[]>;
  run(sql: string, params: Param[]): Promise<RunResult>;
  exec(sql: string): Promise<void>;
  withLock<T>(fn: () => Promise<T>): Promise<T>;
}

function sqliteDriver(): Driver {
  // Vercel functions only allow writes in /tmp: data there is temporary (demo only).
  const dbPath =
    process.env.DATABASE_PATH ??
    (process.env.VERCEL ? path.join("/tmp", "ponte.db") : path.join(process.cwd(), "data", "ponte.db"));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  const bind = (params: Param[]) => params.map((p) => (p === undefined ? null : p));
  return {
    dialect: "sqlite",
    async get(sql, params) {
      return db.prepare(sql).get(...bind(params)) as Row | undefined;
    },
    async all(sql, params) {
      return db.prepare(sql).all(...bind(params)) as Row[];
    },
    async run(sql, params) {
      const r = db.prepare(sql).run(...bind(params));
      return { lastInsertRowid: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async exec(sql) {
      db.exec(sql);
    },
    async withLock(fn) {
      return fn();
    },
  };
}

/** Converts `?` placeholders (outside quoted strings) to $1..$n and SQLite-only functions. */
export function toPostgres(sql: string): string {
  let out = "";
  let n = 0;
  let quote: string | null = null;
  for (const ch of sql) {
    if (quote) {
      if (ch === quote) quote = null;
      out += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
    } else if (ch === "?") {
      out += `$${++n}`;
    } else {
      out += ch;
    }
  }
  return out.replace(/GROUP_CONCAT\(/gi, "string_agg(");
}

// Tables whose primary key is a generated `id`; INSERTs into them get `RETURNING id` on Postgres.
let idTables = new Set<string>();
export function setIdTables(tables: string[]) {
  idTables = new Set(tables);
}

function postgresDriver(url: string): Driver {
  pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // COUNT(*) and BIGINT as numbers
  const pool = new pg.Pool({ connectionString: url, max: Number(process.env.PG_POOL_MAX ?? 5) });
  // NaN (e.g. Number("") from a form) would make Postgres reject the whole query; SQLite just matches nothing.
  const bind = (params: Param[]) => params.map((p) => (p === undefined || (typeof p === "number" && Number.isNaN(p)) ? null : p));
  return {
    dialect: "postgres",
    async get(sql, params) {
      return (await pool.query(toPostgres(sql), bind(params))).rows[0];
    },
    async all(sql, params) {
      return (await pool.query(toPostgres(sql), bind(params))).rows;
    },
    async run(sql, params) {
      let text = toPostgres(sql);
      const table = /^\s*INSERT\s+INTO\s+(\w+)/i.exec(text)?.[1];
      const wantsId = !!table && idTables.has(table) && !/\bRETURNING\b/i.test(text);
      if (wantsId) text += " RETURNING id";
      const r = await pool.query(text, bind(params));
      return { lastInsertRowid: wantsId ? Number(r.rows[0]?.id ?? 0) : 0, changes: r.rowCount ?? 0 };
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async withLock(fn) {
      // Serializes schema creation and seeding across serverless instances.
      const client = await pool.connect();
      try {
        await client.query("SELECT pg_advisory_lock(727001)");
        return await fn();
      } finally {
        await client.query("SELECT pg_advisory_unlock(727001)").catch(() => {});
        client.release();
      }
    },
  };
}

// Vercel's Neon/Postgres integrations may expose the connection string under different names.
export function postgresUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || undefined;
}

/** True on Vercel without Postgres: SQLite lives in /tmp of each instance, so data is temporary. */
export function isTemporaryDatabase(): boolean {
  return !!process.env.VERCEL && !postgresUrl() && !process.env.DATABASE_PATH;
}

let driver: Driver | null = null;
export function getDriver(): Driver {
  if (!driver) {
    const url = postgresUrl();
    driver = url ? postgresDriver(url) : sqliteDriver();
  }
  return driver;
}
