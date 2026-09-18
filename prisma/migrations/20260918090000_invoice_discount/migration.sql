-- AlterTable
ALTER TABLE "Invoice"
  ADD COLUMN "discountLabel" TEXT,
  ADD COLUMN "discountType" TEXT,
  ADD COLUMN "discountValue" DECIMAL(12,2),
  ADD COLUMN "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxableBase" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill: every invoice issued before this feature existed had no
-- discount, so its taxable base is simply its gross subtotal.
UPDATE "Invoice" SET "taxableBase" = "subtotal";
