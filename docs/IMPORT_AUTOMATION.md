# Import and Automation Strategy

Status: design decision recorded 2026-07-26. No external financial connection has been
created.

## Current safe path

The Transactions page can preview `.xlsx` exports from:

- the shared Oran/Danielle FIBI account;
- CAL card exports;
- Isracard card exports.

The action authenticates household membership, checks file type/size/magic, bounds ZIP
expansion and workbook dimensions, normalizes provider quirks, and returns candidates in
memory. It does not store the source file or write transactions.

The supplied account behavior requires transaction-level classification:

- Danielle's CAL and Isracard cards contain both household and business spending. The
  card owner is known, but the financial context is not; every Danielle card row must be
  confirmed or matched by a later user-approved rule.
- The FIBI account is shared by Oran and Danielle. Incoming Bit and bank-transfer
  payments may be Danielle business revenue, so every incoming credit requires context
  confirmation. Bit and bank transfer describe the payment channel, not the financial
  context.
- Oran confirmed that Danielle's Bit and bank-transfer receipts land in this same shared
  FIBI account.
- Strong card-settlement and ATM rows remain transfer warnings. Outgoing Bit or generic
  bank-transfer-like rows are also held for review because they may be either a real
  expense or movement between owned accounts.

## Recommended long-term automation

Use a licensed Israeli Open Banking information-service provider as the single ingestion
connection. The Bank of Israel standard allows customers to consent to sharing bank and
credit-card data with regulated third parties:

- https://boi.org.il/roles/supervisionregulation/bank-sup/open-banking/
- https://www.boi.org.il/roles/supervisionregulation/bank-sup/open-banking/open_banking_standart/

FIBI, CAL, and Isracard all participate as information sources. Their public material
describes consented third-party sharing:

- https://www.boi.org.il/information/public-enquiries-unit/information_service_-providers_payment_initiators/
- https://www.fibi.co.il/private/fibiaccount/infoactions/application/
- https://www.cal-online.co.il/ecredit/financial-terms/open-banking-explained/
- https://marketing.isracard.co.il/developer-portal/

Isracard's direct developer portal requires a relevant regulatory certificate/license.
Tal Family OS should therefore integrate a licensed aggregator API rather than store
bank credentials, automate browser login, or impersonate a regulated provider.

Before choosing an aggregator, compare current license status, coverage of all three
sources, refresh frequency, historical depth, consent renewal, webhooks, pricing, data
residency, deletion/export support, and incident response. The provider must emit the
same provider-neutral candidate contract as the XLSX adapters.

## Email fallback

Official CAL and Isracard services advertise monthly statements/notifications and site
or app access. CAL also documents manual Excel export. They do not establish a reliable
daily or weekly XLSX-attachment feed:

- https://www.cal-online.co.il/service-and-support/cal-mail/
- https://www.cal-online.co.il/service-and-support/
- https://digital.isracard.co.il/products-services/messages/

Email ingestion is therefore a fallback, not the primary automatic connection. If added:

1. use a dedicated mailbox label and OAuth, never a mailbox password;
2. accept real attachments only from allowlisted senders and MIME types;
3. do not follow statement links or automate OTP/login pages;
4. quarantine and preview every attachment before commit;
5. apply the same file limits, parser profiles, fingerprints, RLS, retention, and
   rollback rules as manual upload;
6. store only the minimum batch/provenance metadata needed for audit.

## Ordered next steps

1. Review `docs/IMPORT_PERSISTENCE_PROPOSAL.md`.
2. [Complete locally] Add transaction-level household/business, kind, and income-class
   confirmation to the preview. Real account mapping remains pending.
3. Commit approved candidates atomically with database-aware duplicate checks.
4. Add import history and safe batch rollback.
5. Evaluate licensed Open Banking aggregators with current commercial/security data.
6. Add mailbox attachment ingestion only if it provides real value after Open Banking.
