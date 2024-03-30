/*
  Warnings:

  - You are about to drop the column `epoll_id` on the `points` table. All the data in the column will be lost.
  - Added the required column `epoll_id` to the `point_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `point_history` ADD COLUMN `epoll_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `points` DROP COLUMN `epoll_id`;
