import React from 'react';
import { getVisibleIronSpruePaymentMethods, ironSpruePaymentSummary, type IronSpruePaymentMethodConfig } from '../lib/payment-methods';

export function PaymentMethodStrip({
  methods,
  compact = false,
}: {
  methods?: readonly IronSpruePaymentMethodConfig[];
  compact?: boolean;
}) {
  const visibleMethods = getVisibleIronSpruePaymentMethods(methods);

  return (
    <div className={`payment-method-strip${compact ? ' compact' : ''}`} aria-label="Supported payment methods">
      <div>
        <span>Secure payment</span>
        <strong>{compact ? 'Major cards' : ironSpruePaymentSummary()}</strong>
      </div>
      <ul aria-label="Accepted card payments">
        {visibleMethods.map((method) => (
          <li key={method.id}>
            {method.assetPath ? (
              <img src={method.assetPath} alt={method.label} width="76" height="32" />
            ) : (
              <span>{method.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
