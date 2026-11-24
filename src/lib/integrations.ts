// External integrations (email, WhatsApp, AI). Provider credentials must live on the server
// (Supabase Edge Function secrets), never in the React bundle. In this demo build there is no
// backend, so every provider reports "not configured" and sends fail honestly.

export interface SendResult { ok: boolean; error?: string }
export interface Provider {
  name: string
  configured: boolean
  setupHint: string
  send(msg: { to: string; subject: string | null; body: string }): Promise<SendResult>
}

const notConfigured = (name: string, hint: string): Provider => ({
  name,
  configured: false,
  setupHint: hint,
  async send() { return { ok: false, error: `${name} provider not configured – message not sent` } },
})

export const INTEGRATIONS: Record<'email' | 'whatsapp', Provider> = {
  email: notConfigured('Email', 'Deploy the send-email Edge Function with RESEND_API_KEY (or SMTP credentials) as a Supabase secret.'),
  whatsapp: notConfigured('WhatsApp', 'Deploy the send-whatsapp Edge Function with WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID (Meta WhatsApp Cloud API) as Supabase secrets, and get your templates approved.'),
}

export const AI_ANALYSIS = {
  configured: false,
  setupHint: 'Deploy the analyze-resume Edge Function with an AI provider API key as a Supabase secret. Until then, analysis is rule-based.',
}
