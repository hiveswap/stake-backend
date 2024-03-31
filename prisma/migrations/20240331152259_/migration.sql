/*
  Warnings:

  - You are about to alter the column `point` on the `point_history` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,0)` to `Decimal(65,6)`.
  - You are about to alter the column `hive_point` on the `points` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,0)` to `Decimal(65,6)`.
  - You are about to alter the column `mapo_point` on the `points` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,0)` to `Decimal(65,6)`.

*/
-- AlterTable
ALTER TABLE `point_history` MODIFY `point` DECIMAL(65, 6) NOT NULL;

-- AlterTable
ALTER TABLE `points` MODIFY `hive_point` DECIMAL(65, 6) NOT NULL DEFAULT 0,
    MODIFY `mapo_point` DECIMAL(65, 6) NOT NULL DEFAULT 0;
