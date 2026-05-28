/*
  Warnings:

  - A unique constraint covering the columns `[type,name,created_by]` on the table `categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "categories_type_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "categories_type_name_created_by_key" ON "categories"("type", "name", "created_by");
