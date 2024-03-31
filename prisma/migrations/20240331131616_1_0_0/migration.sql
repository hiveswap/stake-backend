-- CreateTable
CREATE TABLE `bridge_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` INTEGER NOT NULL,
    `from_chain_id` INTEGER NOT NULL,
    `to_chain_id` INTEGER NOT NULL,
    `amount` VARCHAR(191) NOT NULL,
    `from` VARCHAR(191) NOT NULL,
    `to` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `token_addr` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `bridge_events_order_id_key`(`order_id`),
    UNIQUE INDEX `bridge_events_event_id_key`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lock_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` INTEGER NOT NULL,
    `user_addr` VARCHAR(191) NOT NULL,
    `amount` VARCHAR(191) NOT NULL,
    `token_addr` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `lock_events_event_id_key`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `add_liquidity_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` INTEGER NOT NULL,
    `user_addr` VARCHAR(191) NOT NULL,
    `token_x` VARCHAR(191) NOT NULL,
    `token_y` VARCHAR(191) NOT NULL,
    `amount_x` VARCHAR(191) NOT NULL,
    `amount_y` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `add_liquidity_events_event_id_key`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remove_liquidity_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` INTEGER NOT NULL,
    `user_addr` VARCHAR(191) NOT NULL,
    `token_x` VARCHAR(191) NOT NULL,
    `token_y` VARCHAR(191) NOT NULL,
    `amount_x` VARCHAR(191) NOT NULL,
    `amount_y` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `remove_liquidity_events_event_id_key`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `points` (
    `user_addr` VARCHAR(191) NOT NULL,
    `hive_point` DECIMAL(65, 0) NOT NULL DEFAULT 0,
    `mapo_point` DECIMAL(65, 0) NOT NULL DEFAULT 0,
    `timestamp` INTEGER NOT NULL,

    PRIMARY KEY (`user_addr`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `point_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_addr` VARCHAR(191) NOT NULL,
    `timestamp` INTEGER NOT NULL,
    `point` DECIMAL(65, 0) NOT NULL,
    `action` INTEGER NOT NULL,
    `epoll_id` INTEGER NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `point_history_event_id_key`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indexed_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `block_number` INTEGER NOT NULL,
    `update_time` DATETIME(3) NOT NULL,
    `point_checkpoint` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
