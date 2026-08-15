// This is the ONLY boundary through which the platform touches
// blockchain/wallet infrastructure. It talks to a licensed custody provider
// (Fireblocks, BitGo, Copper, etc.) — private keys never exist in our
// application code, database, or logs at any point. The provider generates
// and secures keys; we only ever receive addresses and transaction references.

export interface DepositAddressResult {
  address: string;
  memoTag?: string;
  providerRef: string; // opaque reference used to look this address up with the provider later
}

export interface WithdrawalRequest {
  assetSymbol: string;
  networkCode: string;
  destinationAddress: string;
  destinationMemoTag?: string;
  amount: string;
  /** Our internal withdrawal ID, passed through so the provider's webhook can correlate back to it. */
  clientReference: string;
}

export interface WithdrawalResult {
  providerWithdrawalId: string;
  status: "SUBMITTED" | "REJECTED";
  rejectionReason?: string;
}

export interface DepositWebhookEvent {
  txHash: string;
  assetSymbol: string;
  networkCode: string;
  amount: string;
  confirmations: number;
  destinationAddress: string;
}

export interface CustodyProvider {
  readonly name: string;

  generateDepositAddress(params: { userId: string; assetSymbol: string; networkCode: string }): Promise<DepositAddressResult>;

  requestWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResult>;

  /** Verifies an inbound webhook's signature — must be called before trusting any webhook payload. */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;

  /** Address format validation for a given network, before we ever submit a withdrawal. */
  isValidAddress(address: string, networkCode: string): boolean;
}
