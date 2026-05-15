-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_assigned_vehicle_fkey";

-- DropForeignKey
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_assigned_to_admin_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "assigned_vehicle" DROP NOT NULL,
ALTER COLUMN "assigned_to_admin" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vehicles" ALTER COLUMN "assigned_to_admin" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_vehicle_fkey" FOREIGN KEY ("assigned_vehicle") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_assigned_to_admin_fkey" FOREIGN KEY ("assigned_to_admin") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
