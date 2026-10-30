import "server-only";

import { Client, Environment } from "@paypal/paypal-server-sdk";

export class PayPalConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayPalConfigurationError";
  }
}

type PayPalConfig = {
  clientId: string;
  clientSecret: string;
};

let cachedClient: Client | undefined;

function isRealValue(value: string | undefined): value is string {
  return Boolean(value && !value.startsWith("your_") && value.trim().length > 8);
}

function assertSandboxEnvironment(): void {
  const value = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT ?? "sandbox";

  if (value !== "sandbox") {
    throw new PayPalConfigurationError(
      "Milestone 1 is locked to PayPal Sandbox. NEXT_PUBLIC_PAYPAL_ENVIRONMENT must be sandbox.",
    );
  }
}

function readPayPalConfig(): PayPalConfig {
  assertSandboxEnvironment();

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!isRealValue(clientId) || !isRealValue(clientSecret)) {
    throw new PayPalConfigurationError(
      "PayPal Sandbox credentials are not configured in .env.local.",
    );
  }

  return {
    clientId,
    clientSecret,
  };
}

export function getPublicPayPalConfig(): { clientId: string } | null {
  try {
    const { clientId } = readPayPalConfig();
    return { clientId };
  } catch (error) {
    if (error instanceof PayPalConfigurationError) {
      return null;
    }

    throw error;
  }
}

export function getPayPalClient(): Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = readPayPalConfig();
  cachedClient = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: config.clientId,
      oAuthClientSecret: config.clientSecret,
    },
    environment: Environment.Sandbox,
  });

  return cachedClient;
}
