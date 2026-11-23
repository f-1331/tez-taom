export interface TelegramResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
    migrate_to_chat_id?: number;
  };
}

export class TelegramClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = (token || '').replace(/^["']|["']$/g, '').trim();
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
  }

  public async callApi<T = any>(
    method: string,
    payload: Record<string, any> = {},
    attempt = 1
  ): Promise<TelegramResponse<T>> {
    if (!this.token || this.token.startsWith('mock_')) {
      // Mock mode for tests or unset token
      return { ok: true, result: { id: 12345678, is_mock: true } as any };
    }

    try {
      const res = await fetch(`${this.baseUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: TelegramResponse<T> = await res.json();

      // 429 Rate limit handling with retry_after
      if (res.status === 429 && data.parameters?.retry_after && attempt <= 3) {
        const sleepMs = (data.parameters.retry_after + 1) * 1000;
        console.warn(`[TelegramClient] 429 Rate limit, retrying after ${sleepMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
        return this.callApi<T>(method, payload, attempt + 1);
      }

      // 403 Bot blocked handling
      if (res.status === 403) {
        console.warn(`[TelegramClient] Bot blocked or kicked (403): ${data.description}`);
      }

      return data;
    } catch (err: any) {
      console.error(`[TelegramClient] Network error calling ${method}:`, err.message);
      return { ok: false, description: err.message };
    }
  }

  async getMe() {
    return this.callApi('getMe');
  }

  async getWebhookInfo() {
    return this.callApi('getWebhookInfo');
  }

  async setWebhook(url: string, secretToken: string) {
    return this.callApi('setWebhook', {
      url,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query', 'my_chat_member'],
    });
  }

  async deleteWebhook(dropPendingUpdates = false) {
    return this.callApi('deleteWebhook', {
      drop_pending_updates: dropPendingUpdates,
    });
  }

  async getUpdates(offset?: number, limit = 100, timeout = 25) {
    return this.callApi('getUpdates', {
      offset,
      limit,
      timeout,
      allowed_updates: ['message', 'callback_query', 'my_chat_member'],
    });
  }

  async sendMessage(chatId: string | number | bigint, text: string, options: Record<string, any> = {}) {
    return this.callApi('sendMessage', {
      chat_id: String(chatId),
      text,
      parse_mode: 'HTML',
      ...options,
    });
  }

  async editMessageText(
    chatId: string | number | bigint,
    messageId: number,
    text: string,
    options: Record<string, any> = {}
  ) {
    return this.callApi('editMessageText', {
      chat_id: String(chatId),
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...options,
    });
  }

  async answerCallbackQuery(callbackQueryId: string, options: { text?: string; show_alert?: boolean } = {}) {
    return this.callApi('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...options,
    });
  }
}

// Singletons for Staff and Customer bots
export function getStaffBotClient(): TelegramClient {
  const token = process.env.TELEGRAM_STAFF_BOT_TOKEN || '';
  return new TelegramClient(token);
}

export function getCustomerBotClient(): TelegramClient {
  const token = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN || '';
  return new TelegramClient(token);
}
