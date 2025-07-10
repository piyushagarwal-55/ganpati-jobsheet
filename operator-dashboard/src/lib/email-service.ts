import nodemailer from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationData {
  jobId: number;
  jobDescription: string;
  partyName: string;
  machineName: string;
  operatorName: string;
  amount?: number;
  stockQuantity?: number;
  stockItem?: string;
  updateType:
    | "balance"
    | "stock"
    | "job_status"
    | "job_completion"
    | "job_assignment"
    | "other";
  details?: any;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  // Ganpati Overseas specific email addresses
  private readonly NOTIFICATION_EMAILS = {
    FINANCE: "finance@ganpathioverseas.com",
    STOCK: "stock@ganpathioverseas.com",
    PORTAL: "portal@ganpathioverseas.com",
  };

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      };

      this.transporter = nodemailer.createTransporter(config);
    } catch (error) {
      console.error("Failed to initialize email transporter:", error);
    }
  }

  async sendEmail(
    template: EmailTemplate
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: "Email service not configured" };
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      return { success: true };
    } catch (error) {
      console.error("Email sending failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get appropriate email address based on notification type
  private getNotificationEmail(updateType: string): string {
    switch (updateType) {
      case "balance":
        return this.NOTIFICATION_EMAILS.FINANCE;
      case "stock":
        return this.NOTIFICATION_EMAILS.STOCK;
      case "job_status":
      case "job_completion":
      case "job_assignment":
      case "other":
      default:
        return this.NOTIFICATION_EMAILS.PORTAL;
    }
  }

  // Balance Update Notification
  generateBalanceUpdateEmail(data: NotificationData): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #fffbeb; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert-card { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .amount { font-size: 24px; font-weight: bold; color: #92400e; }
          .detail-row { margin: 8px 0; }
          .label { font-weight: bold; color: #4b5563; }
          .value { color: #1f2937; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          .warning-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; background: #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💰 Balance Update Alert</h2>
            <p>Financial balance has been updated</p>
          </div>
          <div class="content">
            <div class="alert-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3>Job #${data.jobId}</h3>
                <span class="warning-badge">FINANCE ALERT</span>
              </div>
              
              <div style="text-align: center; margin: 20px 0;">
                <div class="amount">₹${data.amount?.toLocaleString() || "0"}</div>
                <p style="color: #6b7280;">Balance Update Amount</p>
              </div>
              
              <div class="detail-row">
                <span class="label">Job Description:</span>
                <span class="value">${data.jobDescription}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Client:</span>
                <span class="value">${data.partyName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Machine:</span>
                <span class="value">${data.machineName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Operator:</span>
                <span class="value">${data.operatorName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Update Time:</span>
                <span class="value">${new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div class="footer">
            <p><strong>Ganpati Overseas</strong> - Finance Department</p>
            <p>This is an automated notification from the operator dashboard.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: this.NOTIFICATION_EMAILS.FINANCE,
      subject: `💰 Balance Update Alert - Job #${data.jobId} (₹${data.amount?.toLocaleString()})`,
      html,
      text: `Balance Update: Job #${data.jobId} - ${data.jobDescription}. Amount: ₹${data.amount}. Client: ${data.partyName}. Machine: ${data.machineName}.`,
    };
  }

  // Stock Update Notification
  generateStockUpdateEmail(data: NotificationData): EmailTemplate {
    const isLowStock = (data.stockQuantity || 0) < 100;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #faf5ff; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert-card { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${isLowStock ? "#ef4444" : "#8b5cf6"}; }
          .quantity { font-size: 24px; font-weight: bold; color: ${isLowStock ? "#dc2626" : "#7c3aed"}; }
          .detail-row { margin: 8px 0; }
          .label { font-weight: bold; color: #4b5563; }
          .value { color: #1f2937; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          .stock-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; background: ${isLowStock ? "#ef4444" : "#8b5cf6"}; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📦 Stock Update Alert</h2>
            <p>Inventory levels have been updated</p>
          </div>
          <div class="content">
            <div class="alert-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3>Stock Update</h3>
                <span class="stock-badge">${isLowStock ? "LOW STOCK" : "STOCK UPDATE"}</span>
              </div>
              
              <div style="text-align: center; margin: 20px 0;">
                <div class="quantity">${data.stockQuantity || 0} units</div>
                <p style="color: #6b7280;">${data.stockItem || "Inventory Item"}</p>
              </div>
              
              <div class="detail-row">
                <span class="label">Related Job:</span>
                <span class="value">Job #${data.jobId} - ${data.jobDescription}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Client:</span>
                <span class="value">${data.partyName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Machine:</span>
                <span class="value">${data.machineName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Operator:</span>
                <span class="value">${data.operatorName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Update Time:</span>
                <span class="value">${new Date().toLocaleString()}</span>
              </div>
              
              ${
                isLowStock
                  ? `
              <div style="background: #fef2f2; padding: 10px; border-radius: 4px; border-left: 3px solid #ef4444; margin: 15px 0;">
                <strong style="color: #dc2626;">⚠️ Low Stock Alert:</strong> This item is running low and may need restocking soon.
              </div>
              `
                  : ""
              }
            </div>
          </div>
          <div class="footer">
            <p><strong>Ganpati Overseas</strong> - Stock Management</p>
            <p>This is an automated notification from the operator dashboard.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: this.NOTIFICATION_EMAILS.STOCK,
      subject: `📦 ${isLowStock ? "LOW STOCK ALERT" : "Stock Update"} - ${data.stockItem || "Inventory"} (${data.stockQuantity} units)`,
      html,
      text: `Stock Update: ${data.stockItem} - ${data.stockQuantity} units remaining. Related to Job #${data.jobId}. ${isLowStock ? "LOW STOCK ALERT!" : ""}`,
    };
  }

  // Job Status Update Notification
  generateJobUpdateEmail(data: NotificationData): EmailTemplate {
    const statusColors = {
      assigned: "#3b82f6",
      in_progress: "#f59e0b",
      completed: "#10b981",
      cancelled: "#ef4444",
      pending: "#6b7280",
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
          .job-card { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #3b82f6; }
          .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; background: #3b82f6; }
          .detail-row { margin: 8px 0; }
          .label { font-weight: bold; color: #4b5563; }
          .value { color: #1f2937; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📋 Job Update Notification</h2>
            <p>Job status has been updated by operator</p>
          </div>
          <div class="content">
            <div class="job-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3>Job #${data.jobId}</h3>
                <span class="status-badge">${data.updateType.toUpperCase()}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Description:</span>
                <span class="value">${data.jobDescription}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Client:</span>
                <span class="value">${data.partyName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Machine:</span>
                <span class="value">${data.machineName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Operator:</span>
                <span class="value">${data.operatorName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Update Time:</span>
                <span class="value">${new Date().toLocaleString()}</span>
              </div>
              
              ${
                data.details
                  ? `
              <div class="detail-row">
                <span class="label">Additional Details:</span>
                <span class="value">${JSON.stringify(data.details, null, 2)}</span>
              </div>
              `
                  : ""
              }
            </div>
          </div>
          <div class="footer">
            <p><strong>Ganpati Overseas</strong> - Operations Portal</p>
            <p>This is an automated notification from the operator dashboard.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: this.NOTIFICATION_EMAILS.PORTAL,
      subject: `📋 Job Update - ${data.jobDescription} (Job #${data.jobId})`,
      html,
      text: `Job Update: Job #${data.jobId} - ${data.jobDescription}. Update type: ${data.updateType}. Machine: ${data.machineName}. Operator: ${data.operatorName}.`,
    };
  }

  // Send notification based on update type
  async sendNotification(
    data: NotificationData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let emailTemplate: EmailTemplate;

      switch (data.updateType) {
        case "balance":
          emailTemplate = this.generateBalanceUpdateEmail(data);
          break;
        case "stock":
          emailTemplate = this.generateStockUpdateEmail(data);
          break;
        case "job_status":
        case "job_completion":
        case "job_assignment":
        case "other":
        default:
          emailTemplate = this.generateJobUpdateEmail(data);
          break;
      }

      return await this.sendEmail(emailTemplate);
    } catch (error) {
      console.error("Notification sending failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const emailService = new EmailService();
