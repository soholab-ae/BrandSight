import { SessionStorage } from '@shopify/shopify-app-session-storage';
import { Session } from '@shopify/shopify-api';
import { db } from './db';
import { sessions } from '@shared/schema';
import { eq, lt } from 'drizzle-orm';

/**
 * PostgreSQL-based session storage for Shopify sessions
 * Uses the existing sessions table in the database
 */
export class PostgreSQLSessionStorage implements SessionStorage {
  
  async storeSession(session: Session): Promise<boolean> {
    try {
      const sessionData = {
        sid: session.id,
        sess: session.toObject() as any,
        expire: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      // Upsert session (insert or update if exists)
      await db
        .insert(sessions)
        .values(sessionData)
        .onConflictDoUpdate({
          target: sessions.sid,
          set: {
            sess: sessionData.sess,
            expire: sessionData.expire,
          },
        });

      console.log(`[SESSION_STORAGE] Stored session: ${session.id} for shop: ${session.shop}`);
      return true;
    } catch (error) {
      console.error('[SESSION_STORAGE] Error storing session:', error);
      return false;
    }
  }

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sid, id))
        .limit(1);

      if (result.length === 0 || !result[0]) {
        console.log(`[SESSION_STORAGE] Session not found: ${id}`);
        return undefined;
      }

      const sessionData = result[0];

      // Check if session is expired
      if (sessionData.expire < new Date()) {
        console.log(`[SESSION_STORAGE] Session expired: ${id}`);
        await this.deleteSession(id);
        return undefined;
      }

      // Reconstruct Session object from stored data
      const session = new Session(sessionData.sess as any);
      console.log(`[SESSION_STORAGE] Loaded session: ${id} for shop: ${session.shop}`);
      return session;
    } catch (error) {
      console.error(`[SESSION_STORAGE] Error loading session ${id}:`, error);
      return undefined;
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      await db.delete(sessions).where(eq(sessions.sid, id));
      console.log(`[SESSION_STORAGE] Deleted session: ${id}`);
      return true;
    } catch (error) {
      console.error(`[SESSION_STORAGE] Error deleting session ${id}:`, error);
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      for (const id of ids) {
        await this.deleteSession(id);
      }
      return true;
    } catch (error) {
      console.error('[SESSION_STORAGE] Error deleting sessions:', error);
      return false;
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      const result = await db
        .select()
        .from(sessions)
        .where(lt(sessions.expire, new Date()));

      const shopSessions: Session[] = [];
      
      for (const sessionData of result) {
        try {
          const session = new Session(sessionData.sess as any);
          if (session.shop === shop) {
            shopSessions.push(session);
          }
        } catch (error) {
          console.error('[SESSION_STORAGE] Error reconstructing session:', error);
        }
      }

      console.log(`[SESSION_STORAGE] Found ${shopSessions.length} sessions for shop: ${shop}`);
      return shopSessions;
    } catch (error) {
      console.error(`[SESSION_STORAGE] Error finding sessions for shop ${shop}:`, error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await db
        .delete(sessions)
        .where(lt(sessions.expire, new Date()));
      
      console.log('[SESSION_STORAGE] Cleaned up expired sessions');
    } catch (error) {
      console.error('[SESSION_STORAGE] Error cleaning up expired sessions:', error);
    }
  }
}

// Create singleton instance
export const postgresSessionStorage = new PostgreSQLSessionStorage();

// Run cleanup every hour
setInterval(() => {
  postgresSessionStorage.cleanupExpiredSessions();
}, 60 * 60 * 1000);
