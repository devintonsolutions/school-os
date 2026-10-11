import { prisma } from "../../config/database";
import type { Role } from "@prisma/client";
const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  bio: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
} as const;

// admin only service
export async function getAllUsers(role?: Role | null) {
  return await prisma.user.findMany({
    where: role ? { role } : {},
    select: publicUserSelect,
    orderBy: { createdAt: "desc" },
  });
}

// admin only service
export async function updateUserRole(userId: string, role: Role) {
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role: role,
    },
    select: publicUserSelect,
  });
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isActive: isActive,
    },
    select: publicUserSelect,
  });
}
