/*
  Warnings:

  - You are about to drop the `lock_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `points` ADD COLUMN `point` DECIMAL(65, 6) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `lock_events`;
