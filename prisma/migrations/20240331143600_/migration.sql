-- AlterTable
ALTER TABLE `bridge_events` MODIFY `from_chain_id` BIGINT NOT NULL,
    MODIFY `to_chain_id` BIGINT NOT NULL;
