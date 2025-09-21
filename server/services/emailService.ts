import nodemailer from 'nodemailer';
import type { 
  Notification,
  NotificationPreferences,
  Alert 
} from "@shared/schema";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  
  /**
   * Initialize the email transporter
   */
  static async initialize(): Promise<void> {
    try {
      // For development, use console logging instead of real SMTP to avoid auth errors
      if (process.env.NODE_ENV !== 'production') {
        // Use a test transporter that doesn't actually send emails but logs them
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
        console.log('Email service initialized in development mode (console logging)');
        return;
      } else {
        // Production email configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      }

      // Verify the connection
      await this.transporter.verify();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      // Don't throw error to prevent app startup failure
      this.transporter = null;
    }
  }

  /**
   * Send an email
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email would be sent:', {
          to: options.to,
          subject: options.subject,
          preview: options.text.substring(0, 100) + '...'
        });
        return;
      }
      throw new Error('Email service not initialized');
    }

    try {
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'BrandSight <noreply@brandsight.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      console.log('Email sent successfully:', result.messageId);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Email delivery failed');
    }
  }

  /**
   * Generate email from notification
   */
  static async generateEmailFromNotification(
    notification: Notification,
    template: string = 'default_alert'
  ): Promise<EmailData> {
    switch (template) {
      case 'critical_alert':
        return this.generateCriticalAlertEmail(notification);
      case 'alert_resolution':
        return this.generateAlertResolutionEmail(notification);
      case 'default_alert':
      default:
        return this.generateDefaultAlertEmail(notification);
    }
  }

  /**
   * Generate daily digest email
   */
  static async generateDailyDigest(
    notifications: Notification[],
    user: { userId: string; storeId: string; emailAddress: string }
  ): Promise<EmailData> {
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const criticalAlerts = notifications.filter(n => n.severity === 'high');
    const mediumAlerts = notifications.filter(n => n.severity === 'medium');
    const lowAlerts = notifications.filter(n => n.severity === 'low');

    const subject = `Daily Alert Digest - ${date} (${notifications.length} alerts)`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles()}
        </style>
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}
          
          <div class="content">
            <h1>Daily Alert Digest</h1>
            <p class="date">${date}</p>
            
            ${criticalAlerts.length > 0 ? `
              <div class="section">
                <h2 class="section-title critical">🚨 Critical Alerts (${criticalAlerts.length})</h2>
                ${criticalAlerts.map(alert => this.formatNotificationForDigest(alert)).join('')}
              </div>
            ` : ''}
            
            ${mediumAlerts.length > 0 ? `
              <div class="section">
                <h2 class="section-title medium">⚠️ Medium Priority Alerts (${mediumAlerts.length})</h2>
                ${mediumAlerts.map(alert => this.formatNotificationForDigest(alert)).join('')}
              </div>
            ` : ''}
            
            ${lowAlerts.length > 0 ? `
              <div class="section">
                <h2 class="section-title low">ℹ️ Low Priority Alerts (${lowAlerts.length})</h2>
                ${lowAlerts.map(alert => this.formatNotificationForDigest(alert)).join('')}
              </div>
            ` : ''}
            
            <div class="cta-section">
              <a href="${process.env.APP_URL || 'https://app.brandsight.com'}/alerts" class="cta-button">
                View All Alerts in Dashboard
              </a>
            </div>
          </div>
          
          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;

    const textBody = `
Daily Alert Digest - ${date}

You have ${notifications.length} alerts to review:

${criticalAlerts.length > 0 ? `CRITICAL ALERTS (${criticalAlerts.length}):\n${criticalAlerts.map(a => `- ${a.message}`).join('\n')}\n\n` : ''}
${mediumAlerts.length > 0 ? `MEDIUM PRIORITY (${mediumAlerts.length}):\n${mediumAlerts.map(a => `- ${a.message}`).join('\n')}\n\n` : ''}
${lowAlerts.length > 0 ? `LOW PRIORITY (${lowAlerts.length}):\n${lowAlerts.map(a => `- ${a.message}`).join('\n')}\n\n` : ''}

View all alerts: ${process.env.APP_URL || 'https://app.brandsight.com'}/alerts

---
BrandSight Alert System
    `;

    return { subject, htmlBody, textBody };
  }

  /**
   * Generate critical alert email
   */
  private static generateCriticalAlertEmail(notification: Notification): EmailData {
    const subject = `🚨 Critical Alert: ${notification.title}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles()}
        </style>
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}
          
          <div class="content">
            <div class="alert-header critical">
              <h1>🚨 Critical Alert</h1>
              <p class="severity-badge critical">HIGH PRIORITY</p>
            </div>
            
            <div class="alert-content">
              <h2>${notification.title}</h2>
              <p class="alert-message">${notification.message}</p>
              
              ${notification.metadata?.vendorName ? `
                <div class="alert-details">
                  <strong>Affected Vendor:</strong> ${notification.metadata.vendorName}
                </div>
              ` : ''}
              
              ${notification.metadata?.thresholdValue && notification.metadata?.currentValue ? `
                <div class="alert-details">
                  <strong>Threshold:</strong> ${notification.metadata.thresholdValue}<br>
                  <strong>Current Value:</strong> ${notification.metadata.currentValue}
                </div>
              ` : ''}
            </div>
            
            <div class="cta-section">
              <a href="${process.env.APP_URL || 'https://app.brandsight.com'}${notification.actionUrl || '/alerts'}" class="cta-button urgent">
                View Alert Details
              </a>
            </div>
            
            <div class="alert-info">
              <p><strong>Alert Time:</strong> ${new Date(notification.createdAt).toLocaleString()}</p>
              <p><em>This is a critical alert that requires immediate attention.</em></p>
            </div>
          </div>
          
          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;

    const textBody = `
🚨 CRITICAL ALERT - IMMEDIATE ACTION REQUIRED

${notification.title}

${notification.message}

${notification.metadata?.vendorName ? `Affected Vendor: ${notification.metadata.vendorName}\n` : ''}
${notification.metadata?.thresholdValue && notification.metadata?.currentValue ? `Threshold: ${notification.metadata.thresholdValue}\nCurrent Value: ${notification.metadata.currentValue}\n` : ''}

Alert Time: ${new Date(notification.createdAt).toLocaleString()}

View details: ${process.env.APP_URL || 'https://app.brandsight.com'}${notification.actionUrl || '/alerts'}

This is a critical alert that requires immediate attention.

---
BrandSight Alert System
    `;

    return { subject, htmlBody, textBody };
  }

  /**
   * Generate default alert email
   */
  private static generateDefaultAlertEmail(notification: Notification): EmailData {
    const severityEmoji = {
      high: '🚨',
      medium: '⚠️',
      low: 'ℹ️'
    };

    const subject = `${severityEmoji[notification.severity]} Alert: ${notification.title}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles()}
        </style>
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}
          
          <div class="content">
            <div class="alert-header ${notification.severity}">
              <h1>${severityEmoji[notification.severity]} Business Alert</h1>
              <p class="severity-badge ${notification.severity}">${notification.severity.toUpperCase()} PRIORITY</p>
            </div>
            
            <div class="alert-content">
              <h2>${notification.title}</h2>
              <p class="alert-message">${notification.message}</p>
              
              ${notification.metadata?.vendorName ? `
                <div class="alert-details">
                  <strong>Affected Vendor:</strong> ${notification.metadata.vendorName}
                </div>
              ` : ''}
            </div>
            
            <div class="cta-section">
              <a href="${process.env.APP_URL || 'https://app.brandsight.com'}${notification.actionUrl || '/alerts'}" class="cta-button">
                View Alert Details
              </a>
            </div>
            
            <div class="alert-info">
              <p><strong>Alert Time:</strong> ${new Date(notification.createdAt).toLocaleString()}</p>
            </div>
          </div>
          
          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;

    const textBody = `
${severityEmoji[notification.severity]} BUSINESS ALERT (${notification.severity.toUpperCase()} PRIORITY)

${notification.title}

${notification.message}

${notification.metadata?.vendorName ? `Affected Vendor: ${notification.metadata.vendorName}\n` : ''}

Alert Time: ${new Date(notification.createdAt).toLocaleString()}

View details: ${process.env.APP_URL || 'https://app.brandsight.com'}${notification.actionUrl || '/alerts'}

---
BrandSight Alert System
    `;

    return { subject, htmlBody, textBody };
  }

  /**
   * Generate alert resolution email
   */
  private static generateAlertResolutionEmail(notification: Notification): EmailData {
    const subject = `✅ Alert Resolved: ${notification.title}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles()}
        </style>
      </head>
      <body>
        <div class="email-container">
          ${this.getEmailHeader()}
          
          <div class="content">
            <div class="alert-header resolved">
              <h1>✅ Alert Resolved</h1>
              <p class="severity-badge resolved">RESOLVED</p>
            </div>
            
            <div class="alert-content">
              <h2>${notification.title}</h2>
              <p class="alert-message">This alert has been successfully resolved.</p>
              
              <p><strong>Original Alert:</strong> ${notification.message}</p>
            </div>
            
            <div class="cta-section">
              <a href="${process.env.APP_URL || 'https://app.brandsight.com'}/alerts" class="cta-button">
                View All Alerts
              </a>
            </div>
          </div>
          
          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;

    const textBody = `
✅ ALERT RESOLVED

${notification.title}

This alert has been successfully resolved.

Original Alert: ${notification.message}

View all alerts: ${process.env.APP_URL || 'https://app.brandsight.com'}/alerts

---
BrandSight Alert System
    `;

    return { subject, htmlBody, textBody };
  }

  /**
   * Format notification for digest email
   */
  private static formatNotificationForDigest(notification: Notification): string {
    return `
      <div class="digest-alert ${notification.severity}">
        <h3>${notification.title}</h3>
        <p>${notification.message}</p>
        <p class="alert-time">${new Date(notification.createdAt).toLocaleString()}</p>
        ${notification.metadata?.vendorName ? `<p class="vendor">Vendor: ${notification.metadata.vendorName}</p>` : ''}
      </div>
    `;
  }

  /**
   * Get email header HTML
   */
  private static getEmailHeader(): string {
    return `
      <div class="header">
        <img src="${process.env.APP_URL || 'https://app.brandsight.com'}/logo.png" alt="BrandSight" class="logo">
        <h3>BrandSight Alert System</h3>
      </div>
    `;
  }

  /**
   * Get email footer HTML
   */
  private static getEmailFooter(): string {
    return `
      <div class="footer">
        <p>
          <a href="${process.env.APP_URL || 'https://app.brandsight.com'}/notifications/preferences">Manage Email Preferences</a> | 
          <a href="${process.env.APP_URL || 'https://app.brandsight.com'}/notifications/unsubscribe">Unsubscribe</a>
        </p>
        <p class="company-info">
          © ${new Date().getFullYear()} BrandSight. All rights reserved.<br>
          This email was sent because you have email notifications enabled for your BrandSight account.
        </p>
      </div>
    `;
  }

  /**
   * Get email CSS styles
   */
  private static getEmailStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f8fafc;
      }
      
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        text-align: center;
      }
      
      .logo {
        height: 40px;
        margin-bottom: 10px;
      }
      
      .content {
        padding: 40px 30px;
      }
      
      .alert-header {
        text-align: center;
        margin-bottom: 30px;
        padding: 20px;
        border-radius: 8px;
      }
      
      .alert-header.critical {
        background-color: #fef2f2;
        border: 2px solid #f87171;
      }
      
      .alert-header.medium {
        background-color: #fefce8;
        border: 2px solid #facc15;
      }
      
      .alert-header.low {
        background-color: #eff6ff;
        border: 2px solid #60a5fa;
      }
      
      .alert-header.resolved {
        background-color: #f0fdf4;
        border: 2px solid #4ade80;
      }
      
      .severity-badge {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .severity-badge.critical {
        background-color: #dc2626;
        color: white;
      }
      
      .severity-badge.medium {
        background-color: #d97706;
        color: white;
      }
      
      .severity-badge.low {
        background-color: #2563eb;
        color: white;
      }
      
      .severity-badge.resolved {
        background-color: #16a34a;
        color: white;
      }
      
      .alert-content {
        margin-bottom: 30px;
      }
      
      .alert-content h2 {
        color: #1f2937;
        margin-bottom: 15px;
        font-size: 24px;
      }
      
      .alert-message {
        font-size: 16px;
        color: #4b5563;
        margin-bottom: 20px;
        line-height: 1.7;
      }
      
      .alert-details {
        background-color: #f9fafb;
        padding: 15px;
        border-radius: 6px;
        margin: 15px 0;
        border-left: 4px solid #6366f1;
      }
      
      .cta-section {
        text-align: center;
        margin: 30px 0;
      }
      
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-decoration: none;
        padding: 15px 30px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        transition: transform 0.2s;
      }
      
      .cta-button.urgent {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      }
      
      .cta-button:hover {
        transform: translateY(-1px);
      }
      
      .alert-info {
        background-color: #f8fafc;
        padding: 20px;
        border-radius: 6px;
        margin-top: 20px;
        border: 1px solid #e2e8f0;
      }
      
      .section {
        margin-bottom: 30px;
      }
      
      .section-title {
        font-size: 18px;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e5e7eb;
      }
      
      .section-title.critical {
        color: #dc2626;
      }
      
      .section-title.medium {
        color: #d97706;
      }
      
      .section-title.low {
        color: #2563eb;
      }
      
      .digest-alert {
        background-color: #f9fafb;
        padding: 15px;
        margin-bottom: 15px;
        border-radius: 6px;
        border-left: 4px solid #e5e7eb;
      }
      
      .digest-alert.critical {
        border-left-color: #dc2626;
      }
      
      .digest-alert.medium {
        border-left-color: #d97706;
      }
      
      .digest-alert.low {
        border-left-color: #2563eb;
      }
      
      .digest-alert h3 {
        font-size: 16px;
        margin-bottom: 8px;
        color: #1f2937;
      }
      
      .digest-alert p {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 5px;
      }
      
      .alert-time {
        font-size: 12px;
        color: #9ca3af;
      }
      
      .vendor {
        font-size: 12px;
        color: #6366f1;
        font-weight: 500;
      }
      
      .date {
        text-align: center;
        color: #6b7280;
        font-size: 14px;
        margin-bottom: 30px;
      }
      
      .footer {
        background-color: #f8fafc;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
      }
      
      .footer a {
        color: #6366f1;
        text-decoration: none;
      }
      
      .footer a:hover {
        text-decoration: underline;
      }
      
      .company-info {
        margin-top: 15px;
        font-size: 12px;
        color: #9ca3af;
        line-height: 1.5;
      }
      
      @media (max-width: 600px) {
        .email-container {
          margin: 0;
          border-radius: 0;
        }
        
        .content {
          padding: 20px 15px;
        }
        
        .header {
          padding: 20px 15px;
        }
        
        .footer {
          padding: 20px 15px;
        }
      }
    `;
  }
}

// Initialize email service on module load
EmailService.initialize().catch(console.error);