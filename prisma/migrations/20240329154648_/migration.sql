/*
  Warnings:

  - You are about to drop the column `blockNumber` on the `indexed_records` table. All the data in the column will be lost.
  - You are about to drop the column `updateTime` on the `indexed_records` table. All the data in the column will be lost.
  - Added the required column `block_number` to the `indexed_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `point_checkpoint` to the `indexed_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `update_time` to the `indexed_records` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `timestamp` on the `lock_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE `indexed_records` DROP COLUMN `blockNumber`,
    DROP COLUMN `updateTime`,
    ADD COLUMN `block_number` INTEGER NOT NULL,
    ADD COLUMN `point_checkpoint` INTEGER NOT NULL,
    ADD COLUMN `update_time` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `lock_events` DROP COLUMN `timestamp`,
    ADD COLUMN `timestamp` INTEGER NOT NULL;
