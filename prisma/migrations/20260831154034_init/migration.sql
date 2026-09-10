-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('pending', 'running', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "UrlCheckStatus" AS ENUM ('pending', 'in_progress', 'done', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'pending',
    "total_urls" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_checks" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "UrlCheckStatus" NOT NULL DEFAULT 'pending',
    "http_status" INTEGER,
    "response_ms" INTEGER,
    "page_title" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "url_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "url_checks_batch_id_idx" ON "url_checks"("batch_id");

-- CreateIndex
CREATE INDEX "url_checks_batch_id_status_idx" ON "url_checks"("batch_id", "status");

-- AddForeignKey
ALTER TABLE "url_checks" ADD CONSTRAINT "url_checks_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
