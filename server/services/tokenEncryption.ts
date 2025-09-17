import crypto from 'crypto';

interface EncryptedToken {
  encrypted: string;
  iv: string;
  authTag: string;
}

export class TokenEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // For AES, this is 16 bytes
  private static readonly TAG_LENGTH = 16; // For GCM, auth tag is 16 bytes
  
  private static getEncryptionKey(): Buffer {
    const key = process.env.TOKEN_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required for token encryption');
    }
    
    // Ensure key is 32 bytes for AES-256
    if (key.length !== 64) { // 64 hex chars = 32 bytes
      throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    
    return Buffer.from(key, 'hex');
  }

  /**
   * Generate a new encryption key (for setup)
   * This should be called once and the result stored in environment variables
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt a Shopify access token
   * Returns base64 encoded encrypted data with IV and auth tag
   */
  static encryptToken(token: string): string {
    if (!token) {
      throw new Error('Token cannot be empty');
    }

    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Use createCipheriv to properly apply the IV for GCM mode
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      cipher.setAutoPadding(true);
      
      let encrypted = cipher.update(token, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();
      
      const encryptedData: EncryptedToken = {
        encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
      };
      
      return Buffer.from(JSON.stringify(encryptedData)).toString('base64');
    } catch (error) {
      console.error('Token encryption failed:', this.sanitizeError(error));
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt a Shopify access token
   * Accepts base64 encoded encrypted data
   */
  static decryptToken(encryptedToken: string): string {
    if (!encryptedToken) {
      throw new Error('Encrypted token cannot be empty');
    }

    try {
      // Check if this is already a plaintext token (for migration)
      if (this.isPlaintextToken(encryptedToken)) {
        console.warn('Found plaintext token, migration needed');
        return encryptedToken;
      }

      const key = this.getEncryptionKey();
      const encryptedData: EncryptedToken = JSON.parse(
        Buffer.from(encryptedToken, 'base64').toString('utf8')
      );
      
      // Extract the IV from stored data and use createDecipheriv for GCM mode
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
      decipher.setAutoPadding(true);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Token decryption failed:', this.sanitizeError(error));
      // Safe migration path: on decrypt failure, try treating as plaintext
      if (this.isPlaintextToken(encryptedToken)) {
        console.warn('Decrypt failed but token appears to be plaintext, using as-is for migration');
        return encryptedToken;
      }
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Check if a token is already encrypted
   */
  static isEncryptedToken(token: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      return typeof parsed.encrypted === 'string' && 
             typeof parsed.iv === 'string' && 
             typeof parsed.authTag === 'string';
    } catch {
      return false;
    }
  }

  /**
   * Check if a token appears to be plaintext (for migration)
   */
  private static isPlaintextToken(token: string): boolean {
    // Shopify access tokens typically start with 'shpat_' or 'shpca_' or similar patterns
    // and are alphanumeric with underscores
    const shopifyTokenPattern = /^(shp[a-z]{2}_[a-zA-Z0-9_]+|[a-zA-Z0-9]{32,})$/;
    return shopifyTokenPattern.test(token) && !this.isEncryptedToken(token);
  }

  /**
   * Sanitize error messages to prevent token leakage in logs
   */
  private static sanitizeError(error: any): string {
    let message = error?.message || String(error);
    
    // Remove any potential tokens from error messages
    // Shopify tokens typically follow patterns like shpat_xxx or shpca_xxx
    message = message.replace(/shp[a-z]{2}_[a-zA-Z0-9_]+/g, '[TOKEN_REDACTED]');
    message = message.replace(/[a-zA-Z0-9]{32,}/g, '[POTENTIAL_TOKEN_REDACTED]');
    
    return message;
  }

  /**
   * Sanitize any string to remove potential tokens for safe logging
   */
  static sanitizeForLogging(input: any): string {
    if (typeof input !== 'string') {
      input = JSON.stringify(input, null, 2);
    }
    
    return input
      .replace(/shp[a-z]{2}_[a-zA-Z0-9_]+/g, '[TOKEN_REDACTED]')
      .replace(/"accessToken":\s*"[^"]+"/g, '"accessToken": "[TOKEN_REDACTED]"')
      .replace(/"access_token":\s*"[^"]+"/g, '"access_token": "[TOKEN_REDACTED]"')
      .replace(/accessToken:\s*[^\s,}]+/g, 'accessToken: [TOKEN_REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9_-]+/gi, 'Bearer [TOKEN_REDACTED]')
      .replace(/[a-zA-Z0-9]{32,}/g, (match: string) => {
        // Only redact if it looks like a token (long alphanumeric strings)
        if (match.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(match)) {
          return '[POTENTIAL_TOKEN_REDACTED]';
        }
        return match;
      });
  }

  /**
   * Migrate a plaintext token to encrypted format
   * Returns the encrypted token if successful, or the original if already encrypted
   */
  static migrateToken(token: string): string {
    if (this.isEncryptedToken(token)) {
      return token; // Already encrypted
    }
    
    if (this.isPlaintextToken(token)) {
      return this.encryptToken(token);
    }
    
    // If we can't determine the format, assume it's plaintext and try to encrypt
    try {
      return this.encryptToken(token);
    } catch (error) {
      console.error('Token migration failed:', this.sanitizeError(error));
      return token; // Return original if migration fails
    }
  }
}

/**
 * Initialize encryption key if not set (for development)
 */
export function ensureEncryptionKey(): void {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('TOKEN_ENCRYPTION_KEY not set, generating one for development...');
      const key = TokenEncryption.generateEncryptionKey();
      process.env.TOKEN_ENCRYPTION_KEY = key;
      console.warn(`Add this to your .env file: TOKEN_ENCRYPTION_KEY=${key}`);
    } else {
      throw new Error('TOKEN_ENCRYPTION_KEY must be set in production environment. Please add this secret to your deployment configuration.');
    }
  }
}