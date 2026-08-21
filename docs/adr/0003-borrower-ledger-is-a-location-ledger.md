# ADR 0003: Lent Stock Stays Sellable — the Borrower Ledger Is a Location Ledger

## Status
Accepted

## Context
"Available" meant two different things in this codebase, and the two got wired to the wrong questions. Lending a pair to a Borrower and bringing it back both flagged the Shoe Image Gallery off **Store-Held Stock** (`shoeInventory.quantity - SUM(lended_shoes.quantity)`) instead of **Physical Quantity** (`shoeInventory.quantity`). So lending out a variant's last in-store pair queued a gallery `remove`, even though the storefront correctly kept listing and selling it.

The settled domain position: a Borrower is a **Storage Location** for stock the owner still owns, not a sale. `lended_shoes` is an append-only ledger of *where a pair currently sits* — lending inserts `+n`, returning inserts `-n`, a borrower-placed sale inserts `-1` — never a balance of what may still be sold.

## Decision
- **Physical Quantity is the only thing that governs sellability and the gallery.** Lending (`lend`) and bringing back (`return`) leave Physical Quantity untouched and write no gallery flag — see `lib/stock/movement.ts`, where `lend`/`return` are `"none"` in the direction table and excluded from `FLAGS_NOTIFIER`.
- **Store-Held Stock governs only Borrower-facing operations**: what can be handed to a Borrower, and what `/admin/rebalance` chases for bring-back/give-away suggestions. It never governs whether a variant is listed or purchasable.
- Store-Held Stock has one definition, `storeHeldStock` / `storeHeldStockSql` in `lib/stock/availability.ts`, shared by the rebalance view, both lend/bring-back guards, and the lend dialog's "lendable" number — so the number the form offers and the number the server enforces can never disagree.

## Relationship to the storefront's zero-quantity guard
This ADR **upholds**, rather than supersedes, the storefront's existing out-of-stock guard (`CONTEXT.md` "Out-of-Stock Size Guard": disable selection when `shoeInventory.quantity = 0`). That guard was correct all along — it already keyed off Physical Quantity, not Store-Held Stock. A lent-but-listed variant is the intended behaviour, not an oversell bug: the owner still owns the pair, and a customer buying it is exactly as valid as one bought from the shelf.

## Consequences
- Lending out an owner's entire remaining stock of a variant no longer pulls its photo from the gallery. The gallery drops a variant only when it is actually sold out (Physical Quantity reaches zero via `sale` / `borrower-sale`), matching what customers can actually still buy.
- Code that reads "lent stock is unsellable" is wrong going forward; the ledger records location, not availability.
