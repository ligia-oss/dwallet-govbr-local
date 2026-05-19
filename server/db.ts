import { and, eq, isNotNull, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, m2mTokenCache, userTokenCache, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Persiste o token M2M no banco de dados para sobreviver a reinicializações do servidor.
 * O token é armazenado como texto plano (já é um JWT opaco; o banco não é exposto publicamente).
 */
export async function upsertM2MToken(params: {
  credentialScope: string;
  tokenHandle: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot persist M2M token: database not available");
    return;
  }
  try {
    await db
      .insert(m2mTokenCache)
      .values({
        credentialScope: params.credentialScope,
        tokenHandle: params.tokenHandle,
        encryptedToken: params.token,
        expiresAt: params.expiresAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          tokenHandle: params.tokenHandle,
          encryptedToken: params.token,
          expiresAt: params.expiresAt,
        },
      });
  } catch (error) {
    console.error("[Database] Failed to persist M2M token:", error);
  }
}

/**
 * Carrega o token M2M do banco de dados se ainda estiver válido (expiração > agora + 60s).
 */
export async function loadM2MToken(credentialScope: string): Promise<{ token: string; tokenHandle: string; expiresAt: Date } | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(m2mTokenCache)
      .where(eq(m2mTokenCache.credentialScope, credentialScope))
      .limit(1);
    if (!rows.length) return null;
    const row = rows[0];
    const expiresAt = new Date(row.expiresAt);
    // Considera inválido se expira em menos de 60 segundos
    if (expiresAt.getTime() <= Date.now() + 60_000) {
      await db.delete(m2mTokenCache).where(eq(m2mTokenCache.credentialScope, credentialScope));
      return null;
    }
    return { token: row.encryptedToken, tokenHandle: row.tokenHandle, expiresAt };
  } catch (error) {
    console.error("[Database] Failed to load M2M token:", error);
    return null;
  }
}

/**
 * Remove o token M2M do banco de dados para um dado escopo de credencial.
 */
export async function deleteM2MToken(credentialScope: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.delete(m2mTokenCache).where(eq(m2mTokenCache.credentialScope, credentialScope));
  } catch (error) {
    console.error("[Database] Failed to delete M2M token:", error);
  }
}

/**
 * Persiste um token de usuário (employee/person) no banco de dados.
 * @param handle - UUID opaco que identifica o token
 * @param token - JWT de acesso do usuário
 * @param expiresAt - Timestamp Unix em ms da expiração (opcional)
 */
export async function storeUserToken(handle: string, token: string, expiresAt?: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot persist user token: database not available");
    return;
  }
  try {
    await db
      .insert(userTokenCache)
      .values({ handle, token, expiresAt: expiresAt ?? null })
      .onDuplicateKeyUpdate({ set: { token, expiresAt: expiresAt ?? null } });
  } catch (error) {
    console.error("[Database] Failed to persist user token:", error);
  }
}

/**
 * Recupera um token de usuário do banco de dados pelo handle.
 * Retorna null se não encontrado ou se o token já expirou.
 */
export async function loadUserToken(handle: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(userTokenCache)
      .where(eq(userTokenCache.handle, handle))
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    // Verificar expiração
    if (row.expiresAt !== null && row.expiresAt !== undefined && Date.now() > row.expiresAt) {
      console.log(`[TokenCache] Token expirado para handle ${handle.substring(0, 8)}... — removendo do banco.`);
      await db.delete(userTokenCache).where(eq(userTokenCache.handle, handle)).catch(() => {});
      return null;
    }
    return row.token;
  } catch (error) {
    console.error("[Database] Failed to load user token:", error);
    return null;
  }
}

/**
 * Remove tokens de usuário expirados do banco de dados.
 */
export async function purgeExpiredUserTokens(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    const now = Date.now();
    const result = await db
      .delete(userTokenCache)
      .where(and(isNotNull(userTokenCache.expiresAt), lt(userTokenCache.expiresAt, now)));
    const deleted = (result as any)?.[0]?.affectedRows ?? 0;
    if (deleted > 0) console.log(`[TokenCache] ${deleted} token(s) expirado(s) removido(s) do banco.`);
    return deleted;
  } catch (error) {
    console.error("[Database] Failed to purge expired user tokens:", error);
    return 0;
  }
}
