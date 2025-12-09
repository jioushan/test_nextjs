// src/handlers.ts
// 模組化的 API 處理器 - 可選的組織方式

import { Client } from "pg";

interface Env {
  HYPERDRIVE: {
    connectionString: string;
  };
}

interface QueryResult {
  success: boolean;
  rowCount?: number;
  rows?: any[];
  error?: string;
}

/**
 * 通用查詢執行函數
 */
export async function executeDbQuery(
  client: Client,
  query: string
): Promise<QueryResult> {
  try {
    const result = await client.query(query);
    return {
      success: true,
      rowCount: result.rowCount || 0,
      rows: result.rows,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 獲取表統計信息
 */
export async function getTableStats(
  client: Client
): Promise<QueryResult> {
  const query = `
    SELECT 
      table_schema,
      table_name,
      (SELECT count(*) FROM information_schema.columns 
       WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
  `;

  return executeDbQuery(client, query);
}

/**
 * 獲取表結構信息
 */
export async function getTableSchema(
  client: Client,
  tableName: string
): Promise<QueryResult> {
  const query = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;

  return executeDbQuery(client, query);
}

/**
 * 分頁查詢
 */
export async function paginatedQuery(
  client: Client,
  tableName: string,
  page: number = 1,
  pageSize: number = 10
): Promise<QueryResult> {
  const offset = (page - 1) * pageSize;
  const query = `
    SELECT * FROM ${tableName}
    LIMIT ${pageSize} OFFSET ${offset};
  `;

  return executeDbQuery(client, query);
}

/**
 * 搜索記錄
 */
export async function searchRecords(
  client: Client,
  tableName: string,
  column: string,
  searchTerm: string
): Promise<QueryResult> {
  const query = `
    SELECT * FROM ${tableName}
    WHERE ${column} LIKE '%${searchTerm}%'
    LIMIT 100;
  `;

  return executeDbQuery(client, query);
}
