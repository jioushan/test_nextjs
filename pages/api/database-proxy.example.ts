// 示例 - 如何在 Next.js API 路由中使用 Cloudflare Worker

// pages/api/database-proxy.ts
// 這個端點將代理請求到你的 Cloudflare Worker

export default async function handler(req: any, res: any) {
  const { action, query } = req.body;
  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;

  if (!workerUrl) {
    return res.status(500).json({ error: "Worker URL not configured" });
  }

  try {
    let endpoint = "";

    switch (action) {
      case "health":
        endpoint = `${workerUrl}/api/health`;
        break;
      case "tables":
        endpoint = `${workerUrl}/api/tables`;
        break;
      case "query":
        endpoint = `${workerUrl}/api/query`;
        break;
      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    const options: RequestInit = {
      method: action === "query" ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
    };

    if (action === "query" && query) {
      options.body = JSON.stringify({ query });
    }

    const response = await fetch(endpoint, options);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// 在 .env.local 中配置
// NEXT_PUBLIC_WORKER_URL=https://your-worker.your-account.workers.dev

// 使用示例：
// const response = await fetch('/api/database-proxy', {
//   method: 'POST',
//   body: JSON.stringify({
//     action: 'query',
//     query: 'SELECT * FROM users'
//   })
// });
