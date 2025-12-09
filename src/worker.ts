import { Client } from "pg";

interface Env {
  HYPERDRIVE: {
    connectionString: string;
  };
}

interface RequestBody {
  name?: string;
  telephone?: string;
  gender?: string;
  more?: string;
  email?: string;
  captchaToken?: string;
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

    // 處理 OPTIONS preflight 請求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 路由分發
    if (pathname === "/api/submit" && request.method === "POST") {
      return handleSubmit(request, env, ctx, corsHeaders);
    } else if (pathname === "/api/health" && request.method === "GET") {
      return handleHealthCheck(env, corsHeaders);
    } else {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          availableEndpoints: [
            "/api/submit - POST 表單提交",
            "/api/health - GET 健康檢查",
          ],
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};

/**
 * 處理表單提交
 */
async function handleSubmit(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const client = new Client({
    connectionString: env.HYPERDRIVE?.connectionString,
    ssl: { rejectUnauthorized: false } as any,
  });

  try {
    await client.connect();
    const body = (await request.json()) as RequestBody;

    // 驗證必填字段
    if (!body.name) {
      return new Response(
        JSON.stringify({ error: "name is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 驗證 email（若提供）
    if (body.email && !isValidEmail(body.email)) {
      return new Response(
        JSON.stringify({ error: "invalid email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 驗證 captcha（若配置了）
    const recaptchaSecret = (env as any)?.RECAPTCHA_SECRET;
    const turnstileSecret = (env as any)?.TURNSTILE_SECRET;
    const captchaEnabled = recaptchaSecret || turnstileSecret;

    if (captchaEnabled) {
      if (!body.captchaToken) {
        return new Response(
          JSON.stringify({ error: "captchaToken required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 根據提供商驗證
      const provider = (env as any)?.NEXT_PUBLIC_2FA_PROVIDER;
      if (provider === "recaptcha") {
        const verified = await verifyRecaptcha(body.captchaToken, recaptchaSecret);
        if (!verified.success) {
          return new Response(
            JSON.stringify({ error: "recaptcha failed", detail: verified }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else if (provider === "turnstile") {
        const verified = await verifyTurnstile(body.captchaToken, turnstileSecret);
        if (!verified.success) {
          return new Response(
            JSON.stringify({ error: "turnstile failed", detail: verified }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // 建立表格（若不存在）
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        name TEXT,
        telephone TEXT,
        gender TEXT,
        email TEXT,
        more TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 使用交易插入數據
    const result = await client.query(
      "INSERT INTO submissions(name, telephone, gender, email, more) VALUES($1,$2,$3,$4,$5) RETURNING id",
      [
        body.name,
        body.telephone || null,
        body.gender || null,
        body.email || null,
        body.more || null,
      ]
    );

    const insertedId = result.rows[0]?.id;

    return new Response(
      JSON.stringify({ ok: true, id: insertedId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("[worker] submit error:", e);
    return new Response(
      JSON.stringify({
        error: "Database error",
        detail: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } finally {
    ctx.waitUntil(client.end());
  }
}

/**
 * 健康檢查
 */
async function handleHealthCheck(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const client = new Client({
      connectionString: env.HYPERDRIVE?.connectionString,
      ssl: { rejectUnauthorized: false } as any,
    });

    await client.connect();
    await client.query("SELECT NOW()");
    await client.end();

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

/**
 * 驗證 Email 格式
 */
function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/**
 * 驗證 Google reCAPTCHA
 */
async function verifyRecaptcha(
  token: string,
  secret: string
): Promise<any> {
  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);

  const response = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      body: params,
    }
  );
  return response.json();
}

/**
 * 驗證 Cloudflare Turnstile
 */
async function verifyTurnstile(token: string, secret: string): Promise<any> {
  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: params,
    }
  );
  return response.json();
}
