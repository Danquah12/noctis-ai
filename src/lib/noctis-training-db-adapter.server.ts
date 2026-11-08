import { getSql, type Sql } from "@/lib/db";
import type { TrainingSqlDatabase, TrainingSqlExecutor } from "./noctis-training-data-persistence.server";

function adaptExecutor(sql: Pick<Sql, "query">): TrainingSqlExecutor {
  return {
    query: async <Row = Record<string, unknown>>(statement: string, parameters: readonly unknown[] = []) => ({
      rows: await sql.query<Row>(statement, [...parameters]),
    }),
  };
}

/**
 * Bridges the application's Neon/PGLite SQL client to the governed training
 * repository. Every write transaction uses one pinned connection/transaction.
 */
export async function getNoctisTrainingDatabase(): Promise<TrainingSqlDatabase> {
  const sql = await getSql();
  const executor = adaptExecutor(sql);
  return {
    ...executor,
    transaction: async <T>(operation: (tx: TrainingSqlExecutor) => Promise<T>) =>
      sql.transaction((tx) => operation(adaptExecutor(tx))),
  };
}
