import { storage } from "../storage";
import type { 
  Notification,
  InsertNotification,
  NotificationPreferences,
  InsertNotificationPreferences,
  EmailQueue,
  InsertEmailQueue,
  Alert,
  PaginationParams,
  PaginatedResponse
} from "@shared/schema";
import { EmailService } from "./emailService";

export interface NotificationServiceConfig {
  enableRealTimeUpdates: boolean;
  defaultEmailFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  maxNotificationsPerUser: number;
  notificationRetentionDays: number;
}

export interface CreateNotificationOptions {
  alert?: Alert;
  sendEmail?: boolean;
  emailTemplate?: string;
  metadata?: any;
}

export class NotificationService {
  private static config: NotificationServiceConfig = {
    enableRealTimeUpdates: true,
    defaultEmailFrequency: 'immediate',
    maxNotificationsPerUser: 1000,
    notificationRetentionDays: 90
  };

  /**
   * Create a new notification from an alert or manual input
   */
  static async createNotification(
    userId: string,
    storeId: string,
    notification: Omit<InsertNotification, 'userId' | 'storeId'>,
    options: CreateNotificationOptions = {}
  ): Promise<Notification> {
    try {
      // Create the notification
      const newNotification = await storage.createNotification({
        ...notification,
        userId,
        storeId,
        alertId: options.alert?.id,
        metadata: options.metadata
      });

      // Get user notification preferences
      const preferences = await this.getUserPreferences(userId, storeId);

      // Check if email should be sent
      if (options.sendEmail !== false && this.shouldSendEmail(newNotification, preferences)) {
        await this.queueEmail(newNotification, preferences, options.emailTemplate);
      }

      // TODO: Implement real-time updates (WebSocket or Server-Sent Events)
      if (this.config.enableRealTimeUpdates) {
        this.broadcastNotification(newNotification);
      }

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Create notifications from alerts automatically
   */
  static async createNotificationFromAlert(alert: Alert): Promise<Notification> {
    try {
      const notification: Omit<InsertNotification, 'userId' | 'storeId'> = {
        alertId: alert.id,
        type: 'alert',
        title: this.generateNotificationTitle(alert),
        message: alert.message,
        severity: alert.severity,
        actionUrl: `/alerts?alertId=${alert.id}`,
        metadata: {
          alertType: alert.alertType,
          vendorId: alert.vendorId,
          thresholdValue: alert.thresholdValue,
          currentValue: alert.currentValue
        }
      };

      return await this.createNotification(
        alert.userId,
        alert.storeId,
        notification,
        {
          alert,
          sendEmail: alert.severity === 'high', // Send email for critical alerts
          emailTemplate: 'critical_alert'
        }
      );
    } catch (error) {
      console.error('Error creating notification from alert:', error);
      throw new Error('Failed to create notification from alert');
    }
  }

  /**
   * Get user notifications with pagination and filters
   */
  static async getUserNotifications(
    userId: string,
    storeId: string,
    params: PaginationParams & {
      isRead?: boolean;
      severity?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<PaginatedResponse<Notification>> {
    try {
      return await storage.getUserNotifications(userId, storeId, params);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  /**
   * Get unread notification count for badge display
   */
  static async getUnreadCount(userId: string, storeId: string): Promise<number> {
    try {
      return await storage.getUnreadNotificationCount(userId, storeId);
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(
    userId: string,
    storeId: string,
    notificationId: string
  ): Promise<Notification> {
    try {
      return await storage.markNotificationAsRead(userId, storeId, notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string, storeId: string): Promise<number> {
    try {
      return await storage.markAllNotificationsAsRead(userId, storeId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Dismiss/delete a notification
   */
  static async dismissNotification(
    userId: string,
    storeId: string,
    notificationId: string
  ): Promise<void> {
    try {
      await storage.deleteNotification(userId, storeId, notificationId);
    } catch (error) {
      console.error('Error dismissing notification:', error);
      throw new Error('Failed to dismiss notification');
    }
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(
    userId: string,
    storeId: string
  ): Promise<NotificationPreferences> {
    try {
      let preferences = await storage.getNotificationPreferences(userId, storeId);
      
      // Create default preferences if none exist
      if (!preferences) {
        const defaultPreferences: InsertNotificationPreferences = {
          userId,
          storeId,
          enableInAppNotifications: true,
          inAppSeverityFilter: ['high', 'medium', 'low'],
          enableEmailNotifications: true,
          emailFrequency: this.config.defaultEmailFrequency,
          emailSeverityFilter: ['high', 'medium'],
          enableCriticalEmailAlerts: true,
          enableDailyDigest: false,
          enableWeeklyDigest: false,
          alertTypePreferences: {
            performance_drop: true,
            performance_spike: true,
            inventory_low: true,
            sales_trend: true
          }
        };

        preferences = await storage.createNotificationPreferences(defaultPreferences);
      }

      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error('Failed to get notification preferences');
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(
    userId: string,
    storeId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      return await storage.updateNotificationPreferences(userId, storeId, updates);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  /**
   * Queue an email for delivery
   */
  static async queueEmail(
    notification: Notification,
    preferences: NotificationPreferences,
    emailTemplate?: string
  ): Promise<EmailQueue> {
    try {
      const emailData = await EmailService.generateEmailFromNotification(
        notification,
        emailTemplate || 'default_alert'
      );

      const emailQueueItem: InsertEmailQueue = {
        userId: notification.userId,
        storeId: notification.storeId,
        notificationId: notification.id,
        alertId: notification.alertId,
        toEmail: preferences.emailAddress || '', // Should be set from user profile
        subject: emailData.subject,
        htmlBody: emailData.htmlBody,
        textBody: emailData.textBody,
        emailType: this.getEmailType(notification),
        priority: this.getEmailPriority(notification.severity),
        scheduledAt: new Date(),
        metadata: {
          notificationId: notification.id,
          severity: notification.severity,
          alertType: notification.metadata?.alertType
        }
      };

      return await storage.queueEmail(emailQueueItem);
    } catch (error) {
      console.error('Error queueing email:', error);
      throw new Error('Failed to queue email');
    }
  }

  /**
   * Process email queue - send pending emails
   */
  static async processEmailQueue(batchSize: number = 10): Promise<number> {
    try {
      const pendingEmails = await storage.getPendingEmails(batchSize);
      let processedCount = 0;

      for (const email of pendingEmails) {
        try {
          // Update status to sending
          await storage.updateEmailStatus(email.id, 'sending');

          // Send the email
          await EmailService.sendEmail({
            to: email.toEmail,
            subject: email.subject,
            html: email.htmlBody,
            text: email.textBody
          });

          // Mark as sent
          await storage.updateEmailStatus(email.id, 'sent', new Date());
          processedCount++;
        } catch (emailError) {
          console.error(`Error sending email ${email.id}:`, emailError);
          
          // Handle retry logic
          if (email.retryCount < email.maxRetries) {
            await storage.retryEmail(email.id, String(emailError));
          } else {
            await storage.updateEmailStatus(email.id, 'failed', undefined, String(emailError));
          }
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Error processing email queue:', error);
      throw new Error('Failed to process email queue');
    }
  }

  /**
   * Clean up old notifications based on retention policy
   */
  static async cleanupOldNotifications(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.notificationRetentionDays);

      return await storage.deleteOldNotifications(cutoffDate);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }

  /**
   * Generate daily digest emails for users
   */
  static async generateDailyDigests(): Promise<number> {
    try {
      const users = await storage.getUsersWithDailyDigestEnabled();
      let digestCount = 0;

      for (const user of users) {
        try {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Get notifications from yesterday
          const notifications = await storage.getUserNotifications(
            user.userId,
            user.storeId,
            {
              startDate: yesterday,
              endDate: today,
              page: 1,
              limit: 50
            }
          );

          if (notifications.data.length > 0) {
            const emailData = await EmailService.generateDailyDigest(
              notifications.data,
              user
            );

            const emailQueueItem: InsertEmailQueue = {
              userId: user.userId,
              storeId: user.storeId,
              toEmail: user.emailAddress,
              subject: emailData.subject,
              htmlBody: emailData.htmlBody,
              textBody: emailData.textBody,
              emailType: 'daily_digest',
              priority: 3,
              scheduledAt: new Date(),
              metadata: {
                digestDate: yesterday.toISOString(),
                notificationCount: notifications.data.length
              }
            };

            await storage.queueEmail(emailQueueItem);
            digestCount++;
          }
        } catch (userError) {
          console.error(`Error generating digest for user ${user.userId}:`, userError);
        }
      }

      return digestCount;
    } catch (error) {
      console.error('Error generating daily digests:', error);
      return 0;
    }
  }

  // Helper methods

  private static shouldSendEmail(
    notification: Notification,
    preferences: NotificationPreferences
  ): boolean {
    if (!preferences.enableEmailNotifications) return false;
    if (!preferences.emailSeverityFilter.includes(notification.severity)) return false;
    
    // Check alert type preferences
    if (notification.metadata?.alertType) {
      const alertTypePrefs = preferences.alertTypePreferences as any;
      if (!alertTypePrefs?.[notification.metadata.alertType]) return false;
    }

    // Check do not disturb settings
    if (this.isDoNotDisturbTime(preferences)) return false;

    return true;
  }

  private static isDoNotDisturbTime(preferences: NotificationPreferences): boolean {
    if (!preferences.doNotDisturbStart || !preferences.doNotDisturbEnd) return false;

    const now = new Date();
    const timezone = preferences.doNotDisturbTimezone || 'UTC';
    
    // TODO: Implement proper timezone handling
    // For now, assume UTC
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = preferences.doNotDisturbStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.doNotDisturbEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight period (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private static generateNotificationTitle(alert: Alert): string {
    const alertTypeMap = {
      performance_drop: 'Performance Alert',
      performance_spike: 'Performance Spike',
      inventory_low: 'Low Inventory Alert',
      sales_trend: 'Sales Trend Alert'
    };

    return alertTypeMap[alert.alertType] || 'Business Alert';
  }

  private static getEmailType(notification: Notification): string {
    if (notification.severity === 'high') return 'critical_alert';
    return 'standard_alert';
  }

  private static getEmailPriority(severity: string): number {
    switch (severity) {
      case 'high': return 1; // Highest priority
      case 'medium': return 2;
      case 'low': return 3;
      default: return 3;
    }
  }

  private static broadcastNotification(notification: Notification): void {
    // TODO: Implement WebSocket broadcasting or Server-Sent Events
    // This would broadcast the notification to connected clients in real-time
    console.log('Broadcasting notification:', notification.id);
  }
}