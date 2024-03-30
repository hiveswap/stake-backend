/*
  Warnings:

  - You are about to drop the column `userAddr` on the `add_liquidity_events` table. All the data in the column will be lost.
  - You are about to drop the column `tokenAddr` on the `lock_events` table. All the data in the column will be lost.
  - You are about to drop the column `userAddr` on the `lock_events` table. All the data in the column will be lost.
  - Added the required column `user_addr` to the `add_liquidity_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_addr` to the `lock_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_addr` to the `lock_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `add_liquidity_events` DROP COLUMN `userAddr`,
    ADD COLUMN `user_addr` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `lock_events` DROP COLUMN `tokenAddr`,
    DROP COLUMN `userAddr`,
    ADD COLUMN `token_addr` VARCHAR(191) NOT NULL,
    ADD COLUMN `user_addr` VARCHAR(191) NOT NULL;
