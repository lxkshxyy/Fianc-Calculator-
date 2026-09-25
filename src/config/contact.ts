/**
 * How members reach the WRC team.
 *
 * Used on the Upgrade screen after someone sends a Diamond request: with a
 * WhatsApp number set they get a "Send on WhatsApp" button that opens a chat
 * with the team, the request already typed. With an email set, a "Send by
 * email" button does the same. Left empty, neither button shows.
 *
 * When the automation is running (config/automation.ts) the request reaches the
 * team by itself, and this button stays as a second way to get in touch.
 *
 * WHATSAPP_NUMBER: country code + number, digits only — e.g. '919876543210'.
 * For the demo this is Lakshay's number, 87448 55792.
 */
export const WHATSAPP_NUMBER: string = '918744855792'
export const SUPPORT_EMAIL: string = ''
