/*
  Warnings:

  - Added the required column `om_stock` to the `outlet_menu` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `outlet_menu` ADD COLUMN `om_is_selling` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `om_stock` DOUBLE NOT NULL;
