// src/lib/infra/rateLimiter.ts
import { getFirestoreInstance } from "../firebase/firebaseAdmin";

const memoryLimiter: Record<string, { count: number; expiresAt: number }> = {};

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  resetTime: string;
}

/**
 * Checks if a request is within the permitted limits.
 * Uses Firestore for persistent distributed limiting, falling back gracefully to memory.
 */
export async function checkRateLimit(
  userId: string,
  bucket: string,
  limit: number,
  windowHours: number = 1
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;
  const resetTime = new Date(Math.ceil(now / windowMs) * windowMs).toISOString();
  
  const cacheKey = `${userId}:${bucket}:${Math.ceil(now / windowMs)}`;

  // 1. Try Firestore Limiter if configured and available
  const db = getFirestoreInstance();
  if (db) {
    try {
      const docRef = db.collection("civicproof_rate_limits").doc(cacheKey);
      const res = await db.runTransaction(async (transaction: any) => {
        const doc = await transaction.get(docRef);
        let count = 1;
        if (doc.exists) {
          const data = doc.data();
          count = (data.count || 0) + 1;
        }
        transaction.set(
          docRef,
          { 
            count, 
            userId, 
            bucket, 
            expiresAt: new Date(resetTime), 
            updatedAt: new Date() 
          }, 
          { merge: true }
        );
        return count;
      });

      return {
        allowed: res <= limit,
        count: res,
        limit,
        remaining: Math.max(0, limit - res),
        resetTime,
      };
    } catch (err) {
      console.warn("Firestore rate limiter failed, falling back to memory:", err);
    }
  }

  // 2. Memory Fallback
  const entry = memoryLimiter[cacheKey];
  if (!entry || now > entry.expiresAt) {
    memoryLimiter[cacheKey] = {
      count: 1,
      expiresAt: now + windowMs,
    };
    return {
      allowed: true,
      count: 1,
      limit,
      remaining: limit - 1,
      resetTime,
    };
  }

  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    count: entry.count,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetTime,
  };
}
