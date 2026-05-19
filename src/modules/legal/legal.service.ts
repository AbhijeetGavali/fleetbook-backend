import bcrypt from "bcryptjs";
import { AppError } from "../../shared/middleware/errorHandler";
import { findUserByEmail } from "../auth/auth.repo";
import { prisma } from "../../shared/utils/prisma";

export async function verifyAndDeleteAccount(
  email: string,
  password: string,
): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user) throw new AppError("Invalid email or password", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid email or password", 401);

  await prisma.user.delete({ where: { id: user.id } });
}
