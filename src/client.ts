// 測試 Hyperdrive 連接的客戶端示例

interface TableResponse {
  success: boolean;
  tables: Array<{
    table_schema: string;
    table_name: string;
  }>;
}

interface QueryResponse {
  success: boolean;
  rowCount: number;
  rows: any[];
}

interface HealthResponse {
  status: string;
  timestamp: string;
}

// 配置
const WORKER_URL = "https://your-worker-name.your-account.workers.dev";

/**
 * 健康檢查
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${WORKER_URL}/api/health`);
  return response.json();
}

/**
 * 獲取所有表
 */
export async function getTables(): Promise<TableResponse> {
  const response = await fetch(`${WORKER_URL}/api/tables`);
  return response.json();
}

/**
 * 執行 SQL 查詢
 */
export async function executeQuery(query: string): Promise<QueryResponse> {
  const response = await fetch(`${WORKER_URL}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 查詢特定表的數據
 */
export async function queryTable(
  tableName: string,
  limit = 10
): Promise<QueryResponse> {
  return executeQuery(`SELECT * FROM ${tableName} LIMIT ${limit}`);
}

// 使用示例
async function main() {
  try {
    console.log("🔍 檢查健康狀態...");
    const health = await checkHealth();
    console.log("✅ 連接正常:", health);

    console.log("\n📊 獲取表列表...");
    const tables = await getTables();
    console.log("✅ 表:", tables);

    console.log("\n🔍 執行查詢...");
    const result = await executeQuery("SELECT version()");
    console.log("✅ 結果:", result);
  } catch (error) {
    console.error("❌ 錯誤:", error);
  }
}

// 如果直接執行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
