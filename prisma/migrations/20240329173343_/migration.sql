-- AlterTable
ALTER TABLE `points` MODIFY `hive_point` DECIMAL(65, 0) NOT NULL DEFAULT 0,
    MODIFY `mapo_point` DECIMAL(65, 0) NOT NULL DEFAULT 0;
