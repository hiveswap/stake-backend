/*
  Warnings:

  - You are about to drop the `CreditHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Credits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IndexedRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RawAddLiquidityEvents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RawDecLiquidityEvents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RawStakeEvents` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `CreditHistory`;

-- DropTable
DROP TABLE `Credits`;

-- DropTable
DROP TABLE `IndexedRecord`;

-- DropTable
DROP TABLE `RawAddLiquidityEvents`;

-- DropTable
DROP TABLE `RawDecLiquidityEvents`;

-- DropTable
DROP TABLE `RawStakeEvents`;

-- CreateTable
CREATE TABLE `lock_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` DATETIME(3) NOT NULL,
    `userAddr` VARCHAR(191) NOT NULL,
    `amount` VARCHAR(191) NOT NULL,
    `tokenAddr` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `add_liquidity_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` DATETIME(3) NOT NULL,
    `userAddr` VARCHAR(191) NOT NULL,
    `tokenX` VARCHAR(191) NOT NULL,
    `tokenY` VARCHAR(191) NOT NULL,
    `amountX` VARCHAR(191) NOT NULL,
    `amountY` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remove_liquidity_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` DATETIME(3) NOT NULL,
    `userAddr` VARCHAR(191) NOT NULL,
    `tokenX` VARCHAR(191) NOT NULL,
    `tokenY` VARCHAR(191) NOT NULL,
    `amountX` VARCHAR(191) NOT NULL,
    `amountY` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `points` (
    `userAddr` VARCHAR(191) NOT NULL,
    `curCredit` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userAddr`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `point_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userAddr` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `credit` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indexed_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `blockNumber` INTEGER NOT NULL,
    `updateTime` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
