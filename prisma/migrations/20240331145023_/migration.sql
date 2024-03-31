/*
  Warnings:

  - Added the required column `block_number` to the `bridge_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `bridge_events` ADD COLUMN `block_number` INTEGER NOT NULL;
