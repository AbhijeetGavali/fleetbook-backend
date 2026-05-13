import { prisma } from "../../shared/utils/prisma";
import { VehicleInput, UpdateVehicleInput } from "./vehicles.schema";

export const findAll = () => prisma.vehicle.findMany({ orderBy: { regNo: "asc" } });
export const findById = (id: string) => prisma.vehicle.findUnique({ where: { id } });
export const create = (data: VehicleInput) => prisma.vehicle.create({ data });
export const update = (id: string, data: UpdateVehicleInput) =>
  prisma.vehicle.update({ where: { id }, data });
export const remove = (id: string) => prisma.vehicle.delete({ where: { id } });
