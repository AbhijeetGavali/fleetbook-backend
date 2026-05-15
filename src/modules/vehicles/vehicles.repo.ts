import { prisma } from "../../shared/utils/prisma";
import { VehicleInput, UpdateVehicleInput } from "./vehicles.schema";

export const findAll = (adminId: string) =>
  prisma.vehicle.findMany({
    where: { assignedToAdmin: adminId },
    orderBy: { regNo: "asc" },
  });

export const findById = (id: string, adminId: string) =>
  prisma.vehicle.findUnique({ where: { id, assignedToAdmin: adminId } });

export const create = (data: VehicleInput, adminId: string) =>
  prisma.vehicle.create({ data: { ...data, assignedToAdmin: adminId } });

export const update = (id: string, data: UpdateVehicleInput, adminId: string) =>
  prisma.vehicle.update({ where: { id, assignedToAdmin: adminId }, data });

export const updateAdmin = (id: string, adminId: string) =>
  prisma.vehicle.update({ where: { id }, data: { assignedToAdmin: adminId } });

export const remove = (id: string, adminId: string) =>
  prisma.vehicle.delete({ where: { id, assignedToAdmin: adminId } });
