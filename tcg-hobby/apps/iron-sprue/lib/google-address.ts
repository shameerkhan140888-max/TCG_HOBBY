import type { CheckoutAddress } from '@capital-hobby/types';

export type IronSprueAddressSuggestion = {
  placeId: string;
  label: string;
  mainText: string;
  secondaryText: string;
};

export type IronSprueAddressValidationStatus = 'valid' | 'confirm' | 'invalid' | 'unavailable';

export type IronSprueAddressValidationResult = {
  available: boolean;
  status: IronSprueAddressValidationStatus;
  address: CheckoutAddress | null;
  formattedAddress: string | null;
  message: string;
};

type GoogleAddressComponent = {
  componentType?: string;
  confirmationLevel?: string;
  inferred?: boolean;
  replaced?: boolean;
  spellCorrected?: boolean;
  unexpected?: boolean;
};

type GoogleValidationResponse = {
  result?: {
    verdict?: {
      addressComplete?: boolean;
      hasInferredComponents?: boolean;
      hasReplacedComponents?: boolean;
      hasUnconfirmedComponents?: boolean;
    };
    address?: {
      formattedAddress?: string;
      postalAddress?: {
        regionCode?: string;
        postalCode?: string;
        administrativeArea?: string;
        locality?: string;
        addressLines?: string[];
      };
      addressComponents?: GoogleAddressComponent[];
    };
  };
};

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
};

function googleApiKey() {
  return process.env.IRON_SPRUE_GOOGLE_MAPS_API_KEY?.trim()
    || process.env.GOOGLE_MAPS_API_KEY?.trim()
    || '';
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function normalisePostcode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

function requiredAddressFieldsPresent(address: CheckoutAddress) {
  return Boolean(address.line1.trim() && address.city.trim() && address.postalCode.trim() && address.country.trim());
}

export function checkoutAddressDeliveryKey(address: CheckoutAddress) {
  return [
    address.line1,
    address.line2 ?? '',
    address.city,
    address.region ?? '',
    address.postalCode,
    address.country,
  ].map((value) => value.trim().toUpperCase()).join('|');
}

export function mapGoogleValidatedAddressForCheckout(
  response: GoogleValidationResponse,
  currentAddress: Pick<CheckoutAddress, 'fullName' | 'email'>,
): CheckoutAddress | null {
  const postalAddress = response.result?.address?.postalAddress;
  if (!postalAddress) return null;
  const country = clean(postalAddress.regionCode).toUpperCase();
  if (country !== 'GB') return null;
  const addressLines = (postalAddress.addressLines ?? []).map(clean).filter(Boolean);
  const mapped: CheckoutAddress = {
    fullName: currentAddress.fullName,
    email: currentAddress.email,
    line1: addressLines[0] ?? '',
    line2: addressLines.slice(1).join(', ') || null,
    city: clean(postalAddress.locality),
    region: clean(postalAddress.administrativeArea) || null,
    postalCode: normalisePostcode(clean(postalAddress.postalCode)),
    country,
  };
  return requiredAddressFieldsPresent(mapped) ? mapped : null;
}

export function googleAddressValidationDecision(response: GoogleValidationResponse, mappedAddress: CheckoutAddress | null) {
  const verdict = response.result?.verdict;
  const components = response.result?.address?.addressComponents ?? [];
  const hasMaterialCorrection = Boolean(
    verdict?.hasInferredComponents
    || verdict?.hasReplacedComponents
    || components.some((component) => component.inferred || component.replaced || component.spellCorrected),
  );
  const hasUnresolvedComponent = Boolean(
    verdict?.hasUnconfirmedComponents
    || components.some((component) => (
      component.unexpected
      || component.confirmationLevel === 'UNCONFIRMED_BUT_PLAUSIBLE'
      || component.confirmationLevel === 'UNCONFIRMED_AND_SUSPICIOUS'
    )),
  );
  if (!mappedAddress || !verdict?.addressComplete || hasUnresolvedComponent) return 'invalid' as const;
  return hasMaterialCorrection ? 'confirm' as const : 'valid' as const;
}

export async function autocompleteIronSprueAddress(input: string, sessionToken: string) {
  const key = googleApiKey();
  const query = clean(input);
  if (!key || query.length < 3) {
    return {
      available: Boolean(key),
      suggestions: [] as IronSprueAddressSuggestion[],
      message: key ? '' : 'Address search is temporarily unavailable. Enter your address manually.',
    };
  }
  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat',
    },
    body: JSON.stringify({
      input: query,
      sessionToken,
      includedRegionCodes: ['gb'],
      languageCode: 'en-GB',
    }),
  });
  if (!response.ok) {
    return {
      available: false,
      suggestions: [] as IronSprueAddressSuggestion[],
      message: 'Address search is temporarily unavailable. Enter your address manually.',
    };
  }
  const payload = await response.json() as GoogleAutocompleteResponse;
  const suggestions = (payload.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction?.placeId && prediction.text?.text))
    .map((prediction) => ({
      placeId: prediction.placeId ?? '',
      label: prediction.text?.text ?? '',
      mainText: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '',
      secondaryText: prediction.structuredFormat?.secondaryText?.text ?? '',
    }))
    .filter((suggestion) => suggestion.placeId && suggestion.label);
  return { available: true, suggestions, message: '' };
}

export async function validateIronSprueAddress(params: {
  address: CheckoutAddress;
  sessionToken?: string | null;
  selectedAddressText?: string | null;
}): Promise<IronSprueAddressValidationResult> {
  const key = googleApiKey();
  if (!key) {
    return {
      available: false,
      status: 'unavailable',
      address: null,
      formattedAddress: null,
      message: 'Address validation is temporarily unavailable. Check the address carefully before continuing.',
    };
  }
  const addressLines = params.selectedAddressText?.trim()
    ? [params.selectedAddressText.trim()]
    : [
        params.address.line1,
        params.address.line2 ?? '',
        params.address.city,
        params.address.region ?? '',
        params.address.postalCode,
      ].map(clean).filter(Boolean);
  const response = await fetch('https://addressvalidation.googleapis.com/v1:validateAddress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
    },
    body: JSON.stringify({
      sessionToken: params.sessionToken || undefined,
      address: {
        regionCode: 'GB',
        addressLines,
      },
      enableUspsCass: false,
    }),
  });
  if (!response.ok) {
    return {
      available: false,
      status: 'unavailable',
      address: null,
      formattedAddress: null,
      message: 'Address validation is temporarily unavailable. Check the address carefully before continuing.',
    };
  }
  const payload = await response.json() as GoogleValidationResponse;
  const mapped = mapGoogleValidatedAddressForCheckout(payload, {
    fullName: params.address.fullName,
    email: params.address.email,
  });
  const status = googleAddressValidationDecision(payload, mapped);
  if (status === 'invalid') {
    return {
      available: true,
      status,
      address: mapped,
      formattedAddress: payload.result?.address?.formattedAddress ?? null,
      message: 'We could not confirm this UK address. Check the postcode, street and town before continuing.',
    };
  }
  return {
    available: true,
    status,
    address: mapped,
    formattedAddress: payload.result?.address?.formattedAddress ?? null,
    message: status === 'confirm'
      ? 'Google suggested a standardised address. Confirm it before continuing.'
      : 'Address confirmed.',
  };
}
