/*
  Warnings:

  - You are about to drop the column `amountX` on the `add_liquidity_events` table. All the data in the column will be lost.
  - You are about to drop the column `amountY` on the `add_liquidity_events` table. All the data in the column will be lost.
  - You are about to drop the column `tokenX` on the `add_liquidity_events` table. All the data in the column will be lost.
  - You are about to drop the column `tokenY` on the `add_liquidity_events` table. All the data in the column will be lost.
  - The primary key for the `points` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `curCredit` on the `points` table. All the data in the column will be lost.
  - You are about to drop the column `userAddr` on the `points` table. All the data in the column will be lost.
  - You are about to drop the column `amountX` on the `remove_liquidity_events` table. All the data in the column will be lost.
  - You are about to drop the column `amountY` on the `remove_liquidity_events` table. All the data in the column will be lost.
  - You are about to drop the column `tokenX` on the `remove_liquidity_events` table. All the data in the column will be lost.
  - You are about to drop the column `tokenY` on the `remove_liquidity_events` table. All the data in the column will be lost.
  - You are about to drop the column `userAddr` on the `remove_liquidity_events` table. All the data in the column will be lost.
  - You are about to drop the `indexed_record` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `amount_x` to the `add_liquidity_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount_y` to the `add_liquidity_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_x` to the `add_liquidity_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_y` to the `add_liquidity_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hive_point` to the `points` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mapo_point` to the `points` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_addr` to the `points` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount_x` to the `remove_liquidity_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount_y` to the `remove_liquidity_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_x` to the `remove_liquidity_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_y` to the `remove_liquidity_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_addr` to the `remove_liquidity_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `add_liquidity_events` DROP COLUMN `amountX`,
    DROP COLUMN `amountY`,
    DROP COLUMN `tokenX`,
    DROP COLUMN `tokenY`,
    ADD COLUMN `amount_x` VARCHAR(191) NOT NULL,
    ADD COLUMN `amount_y` VARCHAR(191) NOT NULL,
    ADD COLUMN `token_x` VARCHAR(191) NOT NULL,
    ADD COLUMN `token_y` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `points` DROP PRIMARY KEY,
    DROP COLUMN `curCredit`,
    DROP COLUMN `userAddr`,
    ADD COLUMN `hive_point` INTEGER NOT NULL,
    ADD COLUMN `mapo_point` INTEGER NOT NULL,
    ADD COLUMN `user_addr` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`user_addr`);

-- AlterTable
ALTER TABLE `remove_liquidity_events` DROP COLUMN `amountX`,
    DROP COLUMN `amountY`,
    DROP COLUMN `tokenX`,
    DROP COLUMN `tokenY`,
    DROP COLUMN `userAddr`,
    ADD COLUMN `amount_x` VARCHAR(191) NOT NULL,
    ADD COLUMN `amount_y` VARCHAR(191) NOT NULL,
    ADD COLUMN `token_x` VARCHAR(191) NOT NULL,
    ADD COLUMN `token_y` VARCHAR(191) NOT NULL,
    ADD COLUMN `user_addr` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `indexed_record`;

-- CreateTable
CREATE TABLE `indexed_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `blockNumber` INTEGER NOT NULL,
    `updateTime` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
