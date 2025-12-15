/*
  Warnings:

  - Added the required column `or_updated_at` to the `order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `order` ADD COLUMN `or_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `or_updated_at` DATETIME(3) NOT NULL;
