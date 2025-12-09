interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

declare module "pg" {
  interface Client {
    connect(): Promise<void>;
    query<T = any>(text: string): Promise<{ rows: T[]; rowCount: number }>;
    end(): Promise<void>;
  }
}
