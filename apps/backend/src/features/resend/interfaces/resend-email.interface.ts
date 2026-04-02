/**
 * Resend Email Interfaces
 */

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  /**
   * Recipient email address(es)
   */
  to: string | string[];

  /**
   * Sender email address
   * If not provided, uses the defaultFrom from module options
   */
  from?: string;

  /**
   * Email subject line
   */
  subject: string;

  /**
   * HTML content of the email
   */
  html?: string;

  /**
   * Plain text content of the email
   */
  text?: string;

  /**
   * Reply-to email address
   */
  replyTo?: string | string[];

  /**
   * CC recipients
   */
  cc?: string | string[];

  /**
   * BCC recipients
   */
  bcc?: string | string[];

  /**
   * Custom headers
   */
  headers?: Record<string, string>;

  /**
   * Tags for categorizing emails
   */
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Response from sending an email
 */
export interface SendEmailResponse {
  /**
   * Unique ID of the sent email
   */
  id: string;
}
