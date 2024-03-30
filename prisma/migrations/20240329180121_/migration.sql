/*
  Warnings:

  - Added the required column `epoll_id` to the `points` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `points` ADD COLUMN `epoll_id` INTEGER NOT NULL;
