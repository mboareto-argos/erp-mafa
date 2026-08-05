-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idempotency_records_company_id_completed_at_idx" ON "idempotency_records"("company_id", "completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_company_id_operation_idempotency_key_key" ON "idempotency_records"("company_id", "operation", "idempotency_key");

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
