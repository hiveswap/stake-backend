-- AlterTable
ALTER TABLE `point_history` MODIFY `point` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `points` MODIFY `hive_point` BIGINT NOT NULL,
    MODIFY `mapo_point` BIGINT NOT NULL;
