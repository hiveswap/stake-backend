/*
  Warnings:

  - Changed the type of `timestamp` on the `add_liquidity_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `timestamp` on the `points` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `timestamp` on the `remove_liquidity_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE `add_liquidity_events` DROP COLUMN `timestamp`,
    ADD COLUMN `timestamp` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `point_history` MODIFY `point` DECIMAL(65, 0) NOT NULL;

-- AlterTable
ALTER TABLE `points` DROP COLUMN `timestamp`,
    ADD COLUMN `timestamp` INTEGER NOT NULL,
    MODIFY `hive_point` DECIMAL(65, 0) NOT NULL,
    MODIFY `mapo_point` DECIMAL(65, 0) NOT NULL;

-- AlterTable
ALTER TABLE `remove_liquidity_events` DROP COLUMN `timestamp`,
    ADD COLUMN `timestamp` INTEGER NOT NULL;
