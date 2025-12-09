import { Client } from "pg";

interface Env {
  HYPERDRIVE: {
    connectionString: string;
  };
}

interface RequestBody {
  query?: string;
  method?: string;
  action?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS 處理
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 建立 client，加入較寬鬆的 SSL 設定以利排查連線問題。
    // 注意：將 `rejectUnauthorized: false` 用於除錯環境；上線請改為正確的憑證驗證。
    const client = new Client({
      connectionString: env.HYPERDRIVE?.connectionString,
      ssl: { rejectUnauthorized: false } as any,
    });

    try {
      console.log('[worker] attempting to connect to database');
      await client.connect();
      console.log('[worker] database connected');

      // 路由處理
      if (pathname === "/api/tables" && request.method === "GET") {
        return handleGetTables(client, corsHeaders);
      } else if (pathname === "/api/query" && request.method === "POST") {
        return handleCustomQuery(request, client, corsHeaders);
      } else if (pathname === "/api/health" && request.method === "GET") {
        return handleHealthCheck(client, corsHeaders);
      } else {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            availableEndpoints: [
              "/api/health - 健康檢查",
              "/api/tables - 獲取所有表",
              "/api/query - 執行自定義查詢 (POST)",
            ],
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (e) {
      // 更詳細的錯誤日誌，方便透過 wrangler tail 檢視
      console.error('[worker] Database error:', e);
      const message = e instanceof Error ? e.message : String(e);
      const stack = e && (e as any).stack ? (e as any).stack : undefined;

      const payload: any = { error: message };
      // 只有在非 production 情況下回傳 stack（由 wrangler.toml 的 env 決定）
      if ((env as any)?.ENVIRONMENT !== 'production' && stack) {
        payload.stack = stack;
      }

      return new Response(JSON.stringify(payload), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      // 使用 waitUntil 確保連接正確關閉
      ctx.waitUntil(client.end());
    }
  },
};

/**
 * 獲取所有表格
 */
async function handleGetTables(
  client: Client,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const result = await client.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name;"
    );

    return new Response(
      JSON.stringify({
        success: true,
        tables: result.rows,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Failed to fetch tables",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * 執行自定義 SQL 查詢
 */
async function handleCustomQuery(
  request: Request,
  client: Client,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = (await request.json()) as RequestBody;
    const query = body.query?.trim();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 基礎安全檢查 - 防止危險操作
    const dangerousCommands = ["DROP", "TRUNCATE", "DELETE"];
    const upperQuery = query.toUpperCase();

    if (dangerousCommands.some((cmd) => upperQuery.includes(cmd))) {
      return new Response(
        JSON.stringify({
          error: "Dangerous commands are not allowed",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await client.query(query);

    return new Response(
      JSON.stringify({
        success: true,
        rowCount: result.rowCount,
        rows: result.rows,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Query execution failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * 健康檢查
 */
async function handleHealthCheck(
  client: Client,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    await client.query("SELECT NOW()");

    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
