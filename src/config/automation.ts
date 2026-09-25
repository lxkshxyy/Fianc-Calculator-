/**
 * THE DIAMOND AUTOMATION — the n8n workflow in automation/n8n, running on the
 * WRC team's PC. Empty until it is running.
 *
 * With DIAMOND_WEBHOOK_URL set, "Send request" on the Upgrade screen posts the
 * request straight to n8n, which:
 *
 *   1. WhatsApps the team (SMS if WhatsApp fails) with the reference, name,
 *      mobile and best time to call;
 *   2. waits for the team to reply "PAID WRC-DXXXXXX" once they have taken the
 *      payment on the call;
 *   3. sends the activation code to the mobile number on the request — the one
 *      on the member's profile — on WhatsApp, or by SMS if that fails.
 *
 * Left empty, the request waits on the phone and the member is offered "Send on
 * WhatsApp" to the team's number in config/contact.ts instead.
 *
 * DIAMOND_WEBHOOK_URL: the workflow's production webhook, e.g.
 *   'https://wrc-admin.ngrok-free.app/webhook/wrc/diamond-request'
 * AUTOMATION_KEY: must match `appKey` in the workflow's Settings node. It keeps
 *   strangers from filling the team's WhatsApp with fake requests. Like the
 *   activation secret it ships inside the APK, so it is a filter, not a lock.
 */
export const DIAMOND_WEBHOOK_URL: string = ''
export const AUTOMATION_KEY = 'wrc-app-c5hxrzfh4aq5qemf6h4nejff'

export function hasAutomation(): boolean {
  return DIAMOND_WEBHOOK_URL.trim() !== ''
}
