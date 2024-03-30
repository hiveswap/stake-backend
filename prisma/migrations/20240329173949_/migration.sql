/*
  Warnings:

  - Added the required column `event_id` to the `lock_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `lock_events` ADD COLUMN `event_id` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `lock_events_event_id_idx` ON `lock_events`(`event_id`);
