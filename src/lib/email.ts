/**
 * Unisender API integration for email sending
 * Docs: https://www.unisender.com/ru/support/api/common/bulk-email/
 */

const UNISENDER_API_URL = 'https://api.unisender.com/ru/api';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  listId?: string; // Unisender list ID for tracking
}

export interface UnisenderResponse {
  result?: {
    email_id?: string;
    message_id?: number;
  };
  error?: string;
  code?: string;
}

/**
 * Send email via Unisender API (sendEmail method)
 * https://www.unisender.com/ru/support/api/messages/sendemail/
 */
export async function sendEmail(options: SendEmailOptions): Promise<UnisenderResponse> {
  const apiKey = process.env.UNISENDER_API_KEY;
  
  if (!apiKey) {
    throw new Error('UNISENDER_API_KEY не настроен. Добавьте его в .env');
  }

  const senderName = process.env.UNISENDER_SENDER_NAME || 'Фестивалим';
  const senderEmail = options.from || process.env.UNISENDER_SENDER_EMAIL;
  
  if (!senderEmail) {
    throw new Error('UNISENDER_SENDER_EMAIL не настроен. Добавьте его в .env');
  }

  // Prepare recipients
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  // Build form data for API request
  const formData = new URLSearchParams();
  formData.append('api_key', apiKey);
  formData.append('email', recipients.join(','));
  formData.append('sender_name', senderName);
  formData.append('sender_email', senderEmail);
  formData.append('subject', options.subject);
  
  if (options.html) {
    formData.append('body', options.html);
  } else if (options.text) {
    formData.append('body', `<pre>${options.text}</pre>`);
  }

  if (options.replyTo) {
    formData.append('reply_to', options.replyTo);
  }

  if (options.listId) {
    formData.append('list_id', options.listId);
  }

  try {
    const response = await fetch(`${UNISENDER_API_URL}/sendEmail?format=json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data: UnisenderResponse = await response.json();

    if (data.error) {
      console.error('Unisender error:', data.error, data.code);
      throw new Error(`Unisender: ${data.error}`);
    }

    return data;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

/**
 * Create email campaign for bulk sending
 * https://www.unisender.com/ru/support/api/messages/createcampaign/
 */
export async function createCampaign(messageId: number, startTime?: string): Promise<UnisenderResponse> {
  const apiKey = process.env.UNISENDER_API_KEY;
  
  if (!apiKey) {
    throw new Error('UNISENDER_API_KEY не настроен');
  }

  const formData = new URLSearchParams();
  formData.append('api_key', apiKey);
  formData.append('message_id', messageId.toString());
  
  if (startTime) {
    formData.append('start_time', startTime); // Format: YYYY-MM-DD HH:MM
  }

  const response = await fetch(`${UNISENDER_API_URL}/createCampaign?format=json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  return response.json();
}

/**
 * Import contacts to Unisender list
 * https://www.unisender.com/ru/support/api/contacts/importcontacts/
 */
export async function importContacts(
  listId: string,
  contacts: Array<{ email: string; name?: string; phone?: string }>
): Promise<UnisenderResponse> {
  const apiKey = process.env.UNISENDER_API_KEY;
  
  if (!apiKey) {
    throw new Error('UNISENDER_API_KEY не настроен');
  }

  const formData = new URLSearchParams();
  formData.append('api_key', apiKey);
  formData.append('field_names[0]', 'email');
  formData.append('field_names[1]', 'Name');
  formData.append('field_names[2]', 'phone');

  contacts.forEach((contact, index) => {
    formData.append(`data[${index}][0]`, contact.email);
    formData.append(`data[${index}][1]`, contact.name || '');
    formData.append(`data[${index}][2]`, contact.phone || '');
    formData.append(`data[${index}][3]`, listId); // list_ids
  });

  const response = await fetch(`${UNISENDER_API_URL}/importContacts?format=json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  return response.json();
}

/**
 * Get lists from Unisender
 * https://www.unisender.com/ru/support/api/contacts/getlists/
 */
export async function getLists(): Promise<UnisenderResponse & { result?: Array<{ id: number; title: string }> }> {
  const apiKey = process.env.UNISENDER_API_KEY;
  
  if (!apiKey) {
    throw new Error('UNISENDER_API_KEY не настроен');
  }

  const response = await fetch(
    `${UNISENDER_API_URL}/getLists?format=json&api_key=${apiKey}`,
    { method: 'GET' }
  );

  return response.json();
}

/**
 * Create a new list in Unisender
 * https://www.unisender.com/ru/support/api/contacts/createlist/
 */
export async function createList(title: string): Promise<UnisenderResponse & { result?: { id: number } }> {
  const apiKey = process.env.UNISENDER_API_KEY;
  
  if (!apiKey) {
    throw new Error('UNISENDER_API_KEY не настроен');
  }

  const formData = new URLSearchParams();
  formData.append('api_key', apiKey);
  formData.append('title', title);

  const response = await fetch(`${UNISENDER_API_URL}/createList?format=json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  return response.json();
}

/**
 * Replace template variables in text
 */
export function replaceTemplateVars(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}
