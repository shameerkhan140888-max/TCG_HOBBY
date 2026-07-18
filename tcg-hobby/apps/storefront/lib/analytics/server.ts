import { META_GRAPH_API_VERSION, getMetaConversionsApiConfig, hashMetaUserData } from './meta';
import { META_STANDARD_EVENTS, type CompleteRegistrationEvent } from './events';

type MetaConversionsApiPayload = {
  data: Array<{
    event_name: string;
    event_time: number;
    event_id: string;
    action_source: 'website';
    event_source_url?: string;
    user_data: {
      em?: string[];
      client_user_agent?: string;
    };
  }>;
  test_event_code?: string;
};

type SafeMetaError = {
  code?: string;
  type?: string;
  message?: string;
};

function getPrimaryEvent(payload: MetaConversionsApiPayload) {
  return payload.data[0];
}

async function getSafeMetaError(response: Response): Promise<SafeMetaError | undefined> {
  try {
    const body = (await response.json()) as unknown;

    if (typeof body !== 'object' || body === null || !('error' in body)) {
      return undefined;
    }

    const error = (body as { error?: unknown }).error;

    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const record = error as Record<string, unknown>;
    return {
      ...(typeof record.code === 'number' || typeof record.code === 'string' ? { code: String(record.code) } : {}),
      ...(typeof record.type === 'string' ? { type: record.type.slice(0, 120) } : {}),
      ...(typeof record.message === 'string' ? { message: record.message.slice(0, 240) } : {}),
    };
  } catch {
    return undefined;
  }
}

function logMetaCapiAttempt(payload: MetaConversionsApiPayload, config: ReturnType<typeof getMetaConversionsApiConfig>) {
  const primaryEvent = getPrimaryEvent(payload);

  console.info('meta_capi_request_attempted', {
    event: 'meta_capi_request_attempted',
    eventName: primaryEvent?.event_name,
    eventId: primaryEvent?.event_id,
    configured: {
      enabled: config.enabled,
      pixelId: Boolean(config.pixelId),
      accessToken: Boolean(config.accessToken),
      testEventCode: Boolean(config.testEventCode),
    },
  });
}

function logMetaCapiSucceeded(payload: MetaConversionsApiPayload, config: ReturnType<typeof getMetaConversionsApiConfig>) {
  const primaryEvent = getPrimaryEvent(payload);

  console.info('meta_capi_request_succeeded', {
    event: 'meta_capi_request_succeeded',
    eventName: primaryEvent?.event_name,
    eventId: primaryEvent?.event_id,
    configured: {
      testEventCode: Boolean(config.testEventCode),
    },
  });
}

function logMetaCapiFailed(
  payload: MetaConversionsApiPayload,
  config: ReturnType<typeof getMetaConversionsApiConfig>,
  failure: { reason: string; status?: number; metaError?: SafeMetaError },
) {
  const primaryEvent = getPrimaryEvent(payload);

  console.error('meta_capi_request_failed', {
    event: 'meta_capi_request_failed',
    eventName: primaryEvent?.event_name,
    eventId: primaryEvent?.event_id,
    configured: {
      enabled: config.enabled,
      pixelId: Boolean(config.pixelId),
      accessToken: Boolean(config.accessToken),
      testEventCode: Boolean(config.testEventCode),
    },
    error: failure,
  });
}

function sanitizeEventSourceUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function sendMetaConversionsApiEvent(payload: MetaConversionsApiPayload, timeoutMs = 1800) {
  const config = getMetaConversionsApiConfig();
  logMetaCapiAttempt(payload, config);

  if (!config.enabled || !config.pixelId || !config.accessToken) {
    logMetaCapiFailed(payload, config, { reason: 'not_configured' });
    return { sent: false as const, reason: 'not_configured' as const };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${config.pixelId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
        access_token: config.accessToken,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const metaError = await getSafeMetaError(response);
      logMetaCapiFailed(payload, config, { reason: 'meta_error', status: response.status, ...(metaError ? { metaError } : {}) });
      return { sent: false as const, reason: 'meta_error' as const, status: response.status };
    }

    logMetaCapiSucceeded(payload, config);
    return { sent: true as const };
  } catch {
    logMetaCapiFailed(payload, config, { reason: 'network_error' });
    return { sent: false as const, reason: 'network_error' as const };
  } finally {
    clearTimeout(timeout);
  }
}

export async function trackCompleteRegistrationServer(event: CompleteRegistrationEvent) {
  const userData: MetaConversionsApiPayload['data'][number]['user_data'] = {};

  if (event.email) {
    userData.em = [hashMetaUserData(event.email)];
  }

  if (event.userAgent) {
    userData.client_user_agent = event.userAgent;
  }

  const eventSourceUrl = sanitizeEventSourceUrl(event.eventSourceUrl);

  return sendMetaConversionsApiEvent({
    data: [
      {
        event_name: META_STANDARD_EVENTS.completeRegistration,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: 'website',
        ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
        user_data: userData,
      },
    ],
  });
}
