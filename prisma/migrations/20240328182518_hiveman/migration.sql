-- CreateTable
CREATE TABLE `RawStakeEvents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` DATETIME(3) NOT NULL,
    `userAddr` VARCHAR(191) NOT NULL,
    `amount` VARCHAR(191) NOT NULL,
    `tokenAddr` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawAddLiquidityEvents` (
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
CREATE TABLE `RawDecLiquidityEvents` (
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
CREATE TABLE `Credits` (
    `userAddr` VARCHAR(191) NOT NULL,
    `curCredit` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userAddr`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userAddr` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `credit` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IndexedRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `blockNumber` INTEGER NOT NULL,
    `updateTime` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
