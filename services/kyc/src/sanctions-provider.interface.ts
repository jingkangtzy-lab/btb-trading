// Real sanctions/PEP (politically exposed person) screening requires a
// licensed compliance data provider (e.g. ComplyAdvantage, Refinitiv World-
// Check, Chainalysis KYT for on-chain screening). This platform cannot and
// does not implement its own sanctions list — it only defines the
// integration boundary so a licensed provider can be plugged in before
// launch. Until a real provider is configured, screening calls should fail
// closed (treated as "review required"), never fail open.

export interface ScreeningSubject {
  legalName: string;
  dateOfBirth?: string;
  country: string;
  documentNumber?: string;
}

export type ScreeningResult =
  | { status: "CLEAR" }
  | { status: "POTENTIAL_MATCH"; matches: { listName: string; matchScore: number }[] }
  | { status: "CONFIRMED_MATCH"; matches: { listName: string; matchScore: number }[] };

export interface SanctionsProvider {
  readonly name: string;
  screen(subject: ScreeningSubject): Promise<ScreeningResult>;
}

/**
 * Fail-closed placeholder used until a real licensed provider is configured
 * via SANCTIONS_PROVIDER_API_KEY. Always returns POTENTIAL_MATCH so nothing
 * can be approved without a human reviewing it — this is intentional and
 * must not be "optimized away" by returning CLEAR by default.
 */
export class UnconfiguredSanctionsProvider implements SanctionsProvider {
  readonly name = "unconfigured";

  async screen(_subject: ScreeningSubject): Promise<ScreeningResult> {
    console.warn(
      "[compliance] No sanctions screening provider is configured. Every KYC submission will require manual review until one is."
    );
    return { status: "POTENTIAL_MATCH", matches: [{ listName: "UNSCREENED — no provider configured", matchScore: 0 }] };
  }
}
