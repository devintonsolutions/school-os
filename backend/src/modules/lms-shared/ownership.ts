import type { UserRole } from "../../types/auth";
import { AppError } from "../../utils/app-error";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

/**
 * Verifies that the requesting user owns the resource or has administrative privileges.
 *
 * @param ownerId The UUID string representing the creator/owner of the resource (e.g. course teacherId)
 * @param user The authenticated user object extracted from req.user
 * @throws AppError 401 if user is unauthenticated
 * @throws AppError 403 if user is neither the owner nor an ADMIN
 */
export function assertOwnerOrAdmin(
  ownerId: string,
  user?: AuthenticatedUser | null
): void {
  if (!user) {
    throw new AppError("Authentication required", 401);
  }

  if (user.role === "ADMIN") {
    return;
  }

  if (user.id !== ownerId) {
    throw new AppError("Forbidden", 403);
  }
}
