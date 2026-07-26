# Import Persistence Proposal

Status: design proposal recorded 2026-07-26. No SQL migration has been created or
applied.

## Product facts that shape the model

- The FIBI account is shared by Oran and Danielle.
- Danielle's CAL and Isracard cards are used for household and business spending.
- Danielle commonly receives customer payments into the shared bank account through Bit
  or ordinary bank transfer.
- Oran confirmed on 2026-07-26 that both payment channels land in the same shared FIBI
  account.
- Card ownership identifies the person/account mapping, but it does not identify a
  transaction's household or business context.
- Bit and bank transfer identify a payment channel. They do not prove whether a credit
  is salary, business income, another household inflow, or an internal transfer.

Consequently, account-level `financial_accounts.context` cannot be copied blindly to
imported transactions for Danielle's cards or incoming shared-bank credits. Context must
be selected per transaction or supplied by a rule the user has explicitly approved.

## Proposed user flow

1. Parse and preview the file without storing it.
2. Map every provider/account-type/masked-last-four tuple to one active
   `financial_accounts` row in the current household.
3. Require household/business confirmation for every Danielle card row.
4. Require household/business confirmation for every incoming FIBI credit, followed by
   an income class: salary, business, or other.
5. Review card settlements, ATM withdrawals, and outgoing Bit/bank-transfer-like rows as
   possible internal transfers.
6. Review pending rows and possible duplicates.
7. Optionally apply a context/category choice to selected rows. Do not offer a blanket
   account default for a known mixed-use account.
8. Commit only the approved, fully classified rows in one database transaction.
9. Show an import receipt with inserted, duplicate, skipped, and review counts.

A later "remember this rule" feature may classify a recurring merchant or payer, but it
must show its match conditions and require explicit approval. Filename, cardholder, Bit,
or transfer wording alone must never create a business rule.

## Proposed schema

The migration should add three household-scoped tables. Names and constraints remain
subject to review before SQL is written.

### `import_account_mappings`

Maps a stable provider account hint to a real ledger account:

- `id uuid primary key`
- `household_id uuid not null`
- `provider text not null` constrained to supported adapters
- `account_type account_type not null` constrained to bank or credit card
- `masked_last4 text not null` constrained to four digits
- `financial_account_id uuid not null`
- `created_by uuid`
- `created_at`, `updated_at`
- unique `(household_id, provider, account_type, masked_last4)`
- composite foreign key from `(financial_account_id, household_id)` to
  `financial_accounts`

Person ownership remains on `financial_accounts.owner_person_id`: Danielle's cards map
to Danielle-owned accounts and the FIBI export maps to the shared account. The mapping
must not contain a trusted context default for known mixed-use sources.

### `import_batches`

Stores a small audit receipt, not the financial file:

- `id uuid primary key`
- `household_id uuid not null`
- `provider text not null`
- `display_file_name text not null` containing only the sanitized basename
- `file_sha256 text not null` containing the source-file hash
- `parser_version text not null`
- `status text not null` constrained to `committed`, `partially_rolled_back`, or
  `rolled_back`
- detected, inserted, duplicate, skipped, and review counts
- `created_by uuid`, `created_at`, `rolled_back_by uuid`, `rolled_back_at`
- a partial unique index on `(household_id, provider, file_sha256)` while status is
  `committed` or `partially_rolled_back`

The raw XLSX, raw worksheet rows, full account number, and provider credentials are not
stored. Re-uploading an active exact file should show its existing receipt instead of
creating a second batch. A completely rolled-back file may be imported again.

### `import_rows`

Links accepted source rows to committed ledger transactions:

- `id uuid primary key`
- `household_id uuid not null`
- `batch_id uuid not null`
- `source_row integer not null`
- `fingerprint text not null`
- `provider_reference text` only when the export supplies a stable reference
- `transaction_id uuid`
- `status text not null` constrained to `inserted`, `duplicate`, `skipped`, or
  `rolled_back`
- `committed_snapshot jsonb` containing only the normalized fields needed to detect
  later edits: account, date, amount, currency, merchant, context, kind, and income class
- `created_at`, `rolled_back_at`
- unique `(batch_id, source_row)`
- composite household foreign keys to `import_batches` and `transactions`

No raw provider row should be kept in `jsonb`. The normalized snapshot is deliberately
small and enables safe rollback checks.

## Duplicate semantics

The current fingerprint is a deterministic SHA-256 over provider, account type,
last-four, transaction date, charge date, signed amount, currency, normalized merchant,
and provider reference.

- A matching stable provider reference on the same mapped account is a strong duplicate.
- A matching fingerprint is a duplicate candidate, not infallible proof. Two legitimate
  same-day purchases can share amount and merchant.
- The database should index `(household_id, fingerprint)` for lookup, but should not use
  that pair alone as an unconditional unique constraint.
- The atomic commit function should reject the same source file while an active receipt
  exists and return database matches for explicit review.
- If the user deliberately accepts two identical-looking purchases, each receives a
  distinct import-row ID while preserving the common fingerprint.

This avoids both accidental re-import and silent loss of legitimate repeated purchases.

## Atomic commit boundary

Use one narrowly scoped `security definer` RPC, tentatively
`commit_transaction_import`, rather than a series of browser inserts.

The RPC must:

1. derive the user from `auth.uid()` and verify an active owner/member household role;
2. derive and validate the household from that membership;
3. verify every account, category, person, and optional business classification belongs
   to the same household;
4. reject pending, unclassified, zero-value, invalid-sign, or unresolved-transfer rows;
5. create the batch, transaction rows, and import-row links atomically;
6. use integer agorot throughout;
7. return a bounded receipt without returning raw source data.

Viewers remain read-only. `anon` receives no table or function privileges. Direct
browser writes to import tables should be denied; normal transaction authorization and
integrity constraints remain in force.

Internal transfers still require the existing transfer RPC because they need two linked
ledger legs. The import commit must not insert a lone transaction whose kind is
`transfer`.

## Safe rollback

Rollback operates on one batch through a separate authenticated RPC:

- A transaction may be removed only when its current normalized fields still equal the
  committed snapshot and it has no later dependent records.
- A transaction edited after import is never silently deleted. Its import row becomes a
  rollback conflict and the batch status becomes `partially_rolled_back`.
- Duplicate and skipped import rows need no ledger deletion.
- A transfer pair must be removed through the existing transfer-removal RPC semantics,
  never by deleting one leg.
- The batch and row receipt remain as a minimal audit trail after rollback.

The current schema archives referenced entities but has no transaction archive column.
The migration review must choose between guarded deletion of unchanged imported
transactions and adding transaction archival. No rollback SQL should be written until
that choice is approved.

## RLS, retention, and storage

- Enable RLS on all three tables.
- Owners and members may read household import receipts; viewers may read but not
  import/rollback unless the broader role policy changes.
- All write RPCs re-check membership and composite household ownership server-side.
- Keep only sanitized filenames, hashes, normalized snapshots, and counts.
- Never store the XLSX in Supabase Storage by default.
- Retain batch/row receipts for audit while a linked transaction exists. A future
  retention job may remove orphaned normalized snapshots only after an export/backup
  policy exists.

This design adds small relational metadata rather than duplicating source files, which
fits the current Supabase Free-plan constraint far better than raw-file retention.

## Required decisions before SQL

1. Approve guarded deletion versus adding `transactions.archived_at` for rollback.
2. Approve whether household viewers may see import filenames and receipts.
3. Decide whether an exact repeat purchase may be manually accepted after a duplicate
   warning. The recommendation is yes, with an explicit override.

After these decisions, the migration can be explained table by table, reviewed, then
created and tested locally. It must not be applied to the linked remote database without
explicit authorization.
