// =============================================
// ФЕСТИВАЛИМ CRM: UIS Call API Integration
// =============================================
// Документация: https://callgear.github.io/call_api/
// UIS Call API использует JSON-RPC 2.0

const UIS_CALL_API_URL = 'https://callapi.uiscom.ru/v4.0';
const UIS_DATA_API_URL = 'https://dataapi.uiscom.ru/v2.0';

interface CallResult {
  success: boolean;
  callId?: number;
  error?: string;
  details?: string;
}

/**
 * Получить access_token через login.user
 * Используется если нет постоянного API-ключа
 */
async function getAccessToken(): Promise<string | null> {
  // Если есть постоянный ключ — используем его
  const permanentKey = process.env.UIS_API_KEY;
  if (permanentKey) return permanentKey;

  // Иначе логинимся через SIP-креденшлы
  const login = process.env.UIS_CALL_API_LOGIN || process.env.NEXT_PUBLIC_SIP_LOGIN;
  const password = process.env.UIS_CALL_API_PASSWORD || process.env.NEXT_PUBLIC_SIP_PASSWORD;

  if (!login || !password) return null;

  try {
    const response = await fetch(UIS_CALL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `login_${Date.now()}`,
        method: 'login.user',
        params: { login, password },
      }),
    });

    const result = await response.json();

    if (result.error) {
      console.error('[UIS] Login error:', result.error);
      return null;
    }

    return result.result?.data?.access_token || null;
  } catch (error) {
    console.error('[UIS] Login fetch error:', error);
    return null;
  }
}

/**
 * Инициировать звонок через UIS Call API (Click-to-Call)
 * 
 * Сценарий:
 * 1. UIS звонит сотруднику на его телефон/софтфон
 * 2. Сотрудник поднимает трубку
 * 3. UIS соединяет сотрудника с клиентом
 * 
 * @param clientPhone - Номер телефона клиента (формат E.164, например 79001234567)
 * @param employeeId - ID сотрудника в UIS (если не указан, берётся из env)
 * @param employeePhone - Номер телефона сотрудника (если не указан, UIS использует все его номера)
 */
export async function initiateCall(
  clientPhone: string,
  employeeId?: number,
  employeePhone?: string
): Promise<CallResult> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return {
      success: false,
      error: 'Не удалось авторизоваться в UIS',
      details: 'Укажите UIS_API_KEY или UIS_CALL_API_LOGIN/UIS_CALL_API_PASSWORD в .env',
    };
  }

  const virtualPhoneNumber = process.env.UIS_VIRTUAL_PHONE_NUMBER;
  if (!virtualPhoneNumber) {
    return {
      success: false,
      error: 'Виртуальный номер UIS не настроен',
      details: 'Укажите UIS_VIRTUAL_PHONE_NUMBER в .env (ваш виртуальный номер UIS в формате 74991234567)',
    };
  }

  const empId = employeeId || parseInt(process.env.UIS_DEFAULT_EMPLOYEE_ID || '0');
  if (!empId) {
    return {
      success: false,
      error: 'ID сотрудника UIS не настроен',
      details: 'Укажите UIS_DEFAULT_EMPLOYEE_ID в .env (ID сотрудника из личного кабинета UIS)',
    };
  }

  const cleanPhone = clientPhone.replace(/\D/g, '');

  try {
    const employeeParams: any = { id: empId };
    if (employeePhone) {
      employeeParams.phone_number = employeePhone.replace(/\D/g, '');
    }

    // Указываем SIP-номер сотрудника для прямого WebRTC-вызова
    const sipLogin = process.env.NEXT_PUBLIC_SIP_LOGIN;
    if (sipLogin && !employeePhone) {
      employeeParams.phone_number = sipLogin;
    }

    const requestBody = {
      jsonrpc: '2.0',
      id: `call_${Date.now()}`,
      method: 'start.employee_call',
      params: {
        access_token: accessToken,
        virtual_phone_number: virtualPhoneNumber,
        employee: employeeParams,
        contact: cleanPhone,
        first_call: 'employee', // Сначала звоним сотруднику, потом клиенту
        switch_at_once: true, // Сразу соединить после ответа клиента
        early_switching: true, // Сотрудник слышит гудки клиента
        show_virtual_phone_number: false,
        direction: 'out',
      },
    };

    console.log('[UIS] Initiating call:', {
      contact: cleanPhone,
      employee: employeeParams,
      virtualPhone: virtualPhoneNumber,
    });

    const response = await fetch(UIS_CALL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (result.error) {
      console.error('[UIS] Call API error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Ошибка UIS Call API',
        details: `Код: ${result.error.code}, Мнемоника: ${result.error.data?.mnemonic || 'unknown'}`,
      };
    }

    const callSessionId = result.result?.data?.call_session_id;
    console.log('[UIS] Call initiated, session:', callSessionId);

    return {
      success: true,
      callId: callSessionId,
    };

  } catch (error: any) {
    console.error('[UIS] Call API fetch error:', error);
    return {
      success: false,
      error: 'Ошибка соединения с UIS Call API',
      details: error.message,
    };
  }
}

/**
 * Завершить звонок
 */
export async function releaseCall(callSessionId: number): Promise<CallResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { success: false, error: 'Не удалось авторизоваться в UIS' };
  }

  try {
    const response = await fetch(UIS_CALL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `release_${Date.now()}`,
        method: 'release.call',
        params: {
          access_token: accessToken,
          call_session_id: callSessionId,
        },
      }),
    });

    const result = await response.json();

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Получить историю звонков через Data API
 */
export async function getCallHistory(
  dateFrom: string,
  dateTo: string,
  limit: number = 100
): Promise<any> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { success: false, error: 'API не настроен' };
  }

  try {
    const response = await fetch(UIS_DATA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `history_${Date.now()}`,
        method: 'get.calls_report',
        params: {
          access_token: accessToken,
          date_from: dateFrom,
          date_till: dateTo,
          limit,
        },
      }),
    });

    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('[UIS] Data API error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Получить список сотрудников через Data API
 */
export async function getEmployees(): Promise<any> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { success: false, error: 'API не настроен' };
  }

  try {
    const response = await fetch(UIS_DATA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `employees_${Date.now()}`,
        method: 'get.employees',
        params: {
          access_token: accessToken,
        },
      }),
    });

    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('[UIS] Data API error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Проверка конфигурации UIS
 */
export function checkUISConfig(): {
  configured: boolean;
  hasAuth: boolean;
  hasVirtualNumber: boolean;
  hasEmployeeId: boolean;
  details: string[];
} {
  const details: string[] = [];
  const hasAuth = !!(
    process.env.UIS_API_KEY ||
    (process.env.UIS_CALL_API_LOGIN && process.env.UIS_CALL_API_PASSWORD) ||
    (process.env.NEXT_PUBLIC_SIP_LOGIN && process.env.NEXT_PUBLIC_SIP_PASSWORD)
  );
  const hasVirtualNumber = !!process.env.UIS_VIRTUAL_PHONE_NUMBER;
  const hasEmployeeId = !!process.env.UIS_DEFAULT_EMPLOYEE_ID;

  if (!hasAuth) details.push('Нет авторизации (UIS_API_KEY или UIS_CALL_API_LOGIN/PASSWORD)');
  if (!hasVirtualNumber) details.push('Не указан UIS_VIRTUAL_PHONE_NUMBER');
  if (!hasEmployeeId) details.push('Не указан UIS_DEFAULT_EMPLOYEE_ID');

  return {
    configured: hasAuth && hasVirtualNumber && hasEmployeeId,
    hasAuth,
    hasVirtualNumber,
    hasEmployeeId,
    details,
  };
}
