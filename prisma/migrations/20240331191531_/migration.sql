/*
  Warnings:

  - You are about to drop the column `timestamp` on the `points` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `points` DROP COLUMN `timestamp`;

-- CreateTable
CREATE TABLE `user_current_lp_amount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_addr` VARCHAR(191) NOT NULL,
    `amount` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `user_current_lp_amount_user_addr_key`(`user_addr`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
