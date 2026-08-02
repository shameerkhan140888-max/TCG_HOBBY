import { createHash } from 'node:crypto';

export const META_GRAPH_API_VERSION = 'v20.0';

export function getMetaPixelId() {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || null;
}

export function isMetaConversionsApiEnabled() {
  return process.env.META_CONVERSIONS_API_ENABLED === 'true';
}

export function getMetaConversionsApiConfig() {
  const pixelId = getMetaPixelId();
  const accessToken = process.env.META_CONVERSIONS_API_ACCESS_TOKEN?.trim() || null;

  return {
    enabled: isMetaConversionsApiEnabled(),
    pixelId,
    accessToken,
    testEventCode: process.env.META_CONVERSIONS_API_TEST_EVENT_CODE?.trim() || null,
  };
}

export function hashMetaUserData(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}
