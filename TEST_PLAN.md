# BTB TRADING — Test Plan (Phase 13)

This consolidates every test written across Phases 3–12 into one place, organized by risk rather than by file, so it's reviewable as a whole rather than scattered across service folders.

## Legend

- ✅ **Runnable now** — pure logic, no database needed, already passes.
- 🔲 **Written as `it.todo()`** — the required behavior is fully specified and reviewable, but needs a real Postgres test database to execute. Becomes runnable the moment we're on real infrastructure (see the Local Run Guide).

## 1. Money-safety (highest priority — these protect real funds)

| Test | Status | Location |
|---|---|---|
| Ledger postings must sum to exactly zero | 🔲 | `services/ledger/test` |
| No posting can drive a balance negative, atomically | 🔲 | `services/ledger/test` |
| Duplicate posting attempts (same reference) are no-ops | 🔲 | `services/ledger/test` |
| Concurrent postings against the same account never race into a wrong balance | 🔲 | `services/ledger/test` |
| Two postings touching the same account pair never deadlock | 🔲 | `services/ledger/test` |
| `getAuthoritativeBalance` always matches the ledger, independent of cache | 🔲 | `services/ledger/test` |
| Reconciliation detects and logs drift, never silently "fixes" it | 🔲 | `services/ledger/test` |
| P&L math is correct for gain/loss/flat scenarios | ✅ | `services/trading-engine/test` |
| Order execution price has exactly one source, never a caller-supplied value | 🔲 | `services/trading-engine/test` |
| Order execution refuses stale market data | ✅ | `services/market-data/test` (verified via fake provider) |
| Order idempotency key prevents double-execution on retry | 🔲 | `services/trading-engine/test` |
| Withdrawal funds are held immediately on request, before any approval | 🔲 | `services/wallet/test` |
| Withdrawal rejection returns held funds correctly | 🔲 | `services/wallet/test` |
| Second-approval rule: same admin cannot give both approvals | 🔲 | `services/wallet/test` |
| Deposit crediting is idempotent against duplicate webhook delivery | 🔲 | `services/wallet/test` |
| Manual adjustments require reason + reference number, or are rejected | 🔲 | `services/ledger/test` (`postManualAdjustment`) |
| Manual adjustments and their audit record commit atomically or not at all | 🔲 | `services/ledger/test` |

## 2. Access control

| Test | Status | Location |
|---|---|---|
| Customer-audience tokens rejected on `/admin/*` routes and vice versa | 🔲 | `services/auth/test` |
| Admin login requires MFA even if never manually enabled | 🔲 | `services/auth/test` |
| Frozen/closed accounts cannot log in | 🔲 | `services/auth/test` |
| Registration never reveals whether an email already exists | 🔲 | `services/auth/test` |
| Refresh token rotation detects replay of an already-used token | 🔲 | `services/auth/test` |
| Only `FINANCE_ADMIN`/`SUPER_ADMIN` can approve withdrawals | 🔲 | `services/wallet/test` |
| Only `KYC_REVIEWER`/`SUPER_ADMIN` can review KYC | 🔲 | `services/kyc/test` |
| KYC service has zero code paths that touch balances | 🔲 | `services/kyc/test` (structural — verifiable by inspection today) |
| Password hashing: correct verify/reject, never throws on malformed hash | ✅ | `services/auth/test` |
| Password strength policy enforced | ✅ | `services/auth/test` |

## 3. Compliance

| Test | Status | Location |
|---|---|---|
| Sanctions screening fails closed with no provider configured | ✅ | `services/kyc/test` |
| Restricted jurisdictions rejected before any screening call | 🔲 | `services/kyc/test` |
| Non-CLEAR screening never leads to automatic approval | 🔲 | `services/kyc/test` |
| AML monitoring only flags, never blocks or approves | 🔲 | `services/kyc/test` |
| Large/velocity/new-account withdrawal patterns correctly flagged | 🔲 | `services/kyc/test` |

## 4. Audit trail

| Test | Status | Location |
|---|---|---|
| Every action on `REQUIRED_AUDITED_ACTIONS` appears at a real call site | ✅ (coverage smoke test) | `services/audit/test` |
| Audit write failure never blocks a successful login | 🔲 | `services/audit/test` |
| Audit write failure inside a financial transaction rolls back the whole transaction | 🔲 | `services/audit/test` |

## 5. Referrals

| Test | Status | Location |
|---|---|---|
| Referral codes don't leak email/user ID | 🔲 | `services/referrals/test` |
| Self-referral rejected | 🔲 | `services/referrals/test` |
| A referee can only ever be linked to one referrer | 🔲 | `services/referrals/test` |
| Commission is proportional to fees paid only, never to referred user's P&L | 🔲 | `services/referrals/test` |

## What "done" looks like for this test plan

Every 🔲 becomes ✅ once we have: (a) a real Postgres instance for tests to run against, and (b) each service's Prisma client pointed at a disposable test database that's reset between test runs (standard pattern: a `docker-compose.test.yml` + a `beforeEach` truncate). This is infrastructure work, not more application code — it happens naturally as part of setting up CI once the project is on GitHub, which is also the point where we'd move `it.todo()` to real `it()` blocks throughout.
