/*
  Warnings:

  - You are about to drop the column `constent` on the `Doc` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "constent",
ADD COLUMN     "content" JSONB;
