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

  if (!config.enabled || !config.pixelId || !config.accessToken) {
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
      return { sent: false as const, reason: 'meta_error' as const, status: response.status };
    }

    return { sent: true as const };
  } catch {
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
