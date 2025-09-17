import { db } from "../db";
import { stores } from "@shared/schema";
import { TokenEncryption } from "./tokenEncryption";
import { eq } from "drizzle-orm";

export class TokenMigration {
  /**
   * Migrate all plaintext tokens to encrypted format
   * This is a one-time migration that should be run after deploying the encryption changes
   */
  static async migrateAllTokens(): Promise<{migrated: number, alreadyEncrypted: number, errors: number}> {
    console.log("Starting token migration process...");
    
    const results = {
      migrated: 0,
      alreadyEncrypted: 0,
      errors: 0
    };

    try {
      // Get all stores with access tokens
      const allStores = await db.select().from(stores);
      console.log(`Found ${allStores.length} stores to check for migration`);

      for (const store of allStores) {
        try {
          if (!store.accessToken) {
            console.log(`Store ${store.id} has no access token, skipping`);
            continue;
          }

          // Check if token is already encrypted
          if (TokenEncryption.isEncryptedToken(store.accessToken)) {
            console.log(`Store ${store.id} already has encrypted token, skipping`);
            results.alreadyEncrypted++;
            continue;
          }

          // Migrate the token
          console.log(`Migrating token for store ${store.id} (${store.domain})`);
          const encryptedToken = TokenEncryption.migrateToken(store.accessToken);
          
          // Update the store with encrypted token
          await db
            .update(stores)
            .set({ accessToken: encryptedToken })
            .where(eq(stores.id, store.id));
          
          results.migrated++;
          console.log(`Successfully migrated token for store ${store.id}`);

        } catch (error) {
          console.error(`Error migrating token for store ${store.id}:`, TokenEncryption.sanitizeForLogging(error));
          results.errors++;
        }
      }

      console.log(`Token migration completed:`, results);
      return results;

    } catch (error) {
      console.error('Fatal error during token migration:', TokenEncryption.sanitizeForLogging(error));
      throw error;
    }
  }

  /**
   * Verify that all tokens are properly encrypted and can be decrypted
   */
  static async verifyTokenEncryption(): Promise<{verified: number, errors: number}> {
    console.log("Starting token encryption verification...");
    
    const results = {
      verified: 0,
      errors: 0
    };

    try {
      const allStores = await db.select().from(stores);
      console.log(`Verifying ${allStores.length} store tokens`);

      for (const store of allStores) {
        try {
          if (!store.accessToken) {
            console.log(`Store ${store.id} has no access token, skipping verification`);
            continue;
          }

          // Try to decrypt the token to verify it's properly encrypted
          const decryptedToken = TokenEncryption.decryptToken(store.accessToken);
          
          // Basic validation that the decrypted token looks like a Shopify token
          if (typeof decryptedToken === 'string' && decryptedToken.length > 0) {
            results.verified++;
            console.log(`Token verification successful for store ${store.id}`);
          } else {
            throw new Error('Decrypted token is invalid');
          }

        } catch (error) {
          console.error(`Token verification failed for store ${store.id}:`, TokenEncryption.sanitizeForLogging(error));
          results.errors++;
        }
      }

      console.log(`Token verification completed:`, results);
      return results;

    } catch (error) {
      console.error('Fatal error during token verification:', TokenEncryption.sanitizeForLogging(error));
      throw error;
    }
  }

  /**
   * Get encryption status for all stores
   */
  static async getEncryptionStatus(): Promise<{encrypted: number, plaintext: number, total: number}> {
    const allStores = await db.select().from(stores);
    
    const status = {
      encrypted: 0,
      plaintext: 0,
      total: allStores.length
    };

    for (const store of allStores) {
      if (!store.accessToken) {
        continue;
      }

      if (TokenEncryption.isEncryptedToken(store.accessToken)) {
        status.encrypted++;
      } else {
        status.plaintext++;
      }
    }

    return status;
  }

  /**
   * Run a complete migration and verification process
   */
  static async runCompleteMigration(): Promise<void> {
    console.log("=== Starting Complete Token Security Migration ===");
    
    try {
      // Step 1: Check current status
      const initialStatus = await this.getEncryptionStatus();
      console.log("Initial encryption status:", initialStatus);

      if (initialStatus.plaintext === 0) {
        console.log("All tokens are already encrypted!");
        return;
      }

      // Step 2: Migrate tokens
      const migrationResults = await this.migrateAllTokens();
      
      if (migrationResults.errors > 0) {
        console.error(`Migration completed with ${migrationResults.errors} errors`);
      }

      // Step 3: Verify encryption
      const verificationResults = await this.verifyTokenEncryption();
      
      if (verificationResults.errors > 0) {
        console.error(`Verification completed with ${verificationResults.errors} errors`);
      }

      // Step 4: Final status check
      const finalStatus = await this.getEncryptionStatus();
      console.log("Final encryption status:", finalStatus);

      console.log("=== Migration Complete ===");
      console.log(`✓ ${migrationResults.migrated} tokens migrated`);
      console.log(`✓ ${migrationResults.alreadyEncrypted} tokens already encrypted`);
      console.log(`✓ ${verificationResults.verified} tokens verified`);
      
      if (migrationResults.errors + verificationResults.errors > 0) {
        console.error(`⚠ ${migrationResults.errors + verificationResults.errors} total errors occurred`);
      }

    } catch (error) {
      console.error("Critical error during migration:", TokenEncryption.sanitizeForLogging(error));
      throw error;
    }
  }
}

/**
 * Standalone migration function that can be called from server initialization
 */
export async function runTokenMigration(): Promise<void> {
  try {
    await TokenMigration.runCompleteMigration();
  } catch (error) {
    console.error("Token migration failed:", TokenEncryption.sanitizeForLogging(error));
    // Don't throw here - we don't want migration failures to crash the server
  }
}