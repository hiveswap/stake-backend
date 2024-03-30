/*
  Warnings:

  - You are about to drop the column `credit` on the `point_history` table. All the data in the column will be lost.
  - You are about to drop the column `userAddr` on the `point_history` table. All the data in the column will be lost.
  - Added the required column `action` to the `point_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `point` to the `point_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_addr` to the `point_history` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `timestamp` on the `point_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE `point_history` DROP COLUMN `credit`,
    DROP COLUMN `userAddr`,
    ADD COLUMN `action` INTEGER NOT NULL,
    ADD COLUMN `point` INTEGER NOT NULL,
    ADD COLUMN `user_addr` VARCHAR(191) NOT NULL,
    DROP COLUMN `timestamp`,
    ADD COLUMN `timestamp` INTEGER NOT NULL;
