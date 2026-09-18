-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "pricesIncludeVat" BOOLEAN NOT NULL DEFAULT false;

-- Every invoice issued before this feature existed used the classic
-- "add VAT on top" calculation, which is exactly what the default above
-- reproduces — nothing to backfill.
