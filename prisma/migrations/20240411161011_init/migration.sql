-- AlterTable
ALTER TABLE `add_liquidity_events` ADD COLUMN `valid` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `remove_liquidity_events` ADD COLUMN `valid` BOOLEAN NOT NULL DEFAULT false;
