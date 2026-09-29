import { WHATSAPP_NUMBER } from '@/config/contact'

/**
 * A link that opens a WhatsApp chat with the WRC team, `text` already typed.
 * Null when no number is configured, so a caller shows no button rather than a
 * broken one.
 */
export function teamWhatsAppUrl(text: string): string | null {
  const digits = WHATSAPP_NUMBER.replace(/\D/g, '')
  if (digits === '') return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
