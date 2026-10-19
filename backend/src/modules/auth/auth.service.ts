import crypto from "crypto";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { comparePassword, hashPassword } from "../../utils/password";
import { createAccessToken } from "../../utils/jwt";


import type {
  signUpSchema,
  loginSchema,
  refreshTokenSchema,
  userSelfUpdateSchema
} from "./auth.schema";

import type { z } from "zod";

const EMAIL_VERIFICATION_TOKEN_EXPIRATION_MINUTES = 15;

type SignUpInput = z.infer<typeof signUpSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
type userSelfUpdateInput = z.infer<typeof userSelfUpdateSchema>;

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
// this service is only designed for student signup not for teachers or admins 
export async function signup(data: SignUpInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }
  
  const { user, emailVerificationToken } = await prisma.$transaction(async (tx) => {

    const passwordHash = await hashPassword(data.password);
  
    const user = await tx.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        role: "STUDENT",
      },
    });
  
    const token = crypto.randomBytes(32).toString("hex")
  
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  
    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRATION_MINUTES * 60 * 1000
    )
    const emailVerificationToken = await tx.emailVerificationToken.create({
      data:{
        userId: user.id,
        tokenHash: tokenHash,
        expiresAt: expiresAt
      }
    })

    return { user, emailVerificationToken }
  })
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    
  };
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordValid = await comparePassword(data.password, user.passwordHash);

  if (!passwordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is inactive", 403);
  }

  const accessToken = createAccessToken(user.id, user.role);

  const refreshToken = generateRefreshToken();

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),

    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    }),
  ]);

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    accessToken,
    refreshToken,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.isActive) {
    throw new AppError("Account is inactive", 403);
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

export async function updateCurrentUser(userId: string, data: userSelfUpdateInput){

  const updatedUser = await prisma.user.update({
    where:{
      'id':userId
    },
    data:data,
    select:{
      'id':true,
      'firstName':true,
      'lastName':true,
      'email':true,
      'bio':true,
      'avatarUrl':true,
      'role':true
    }
  })

  return updatedUser

}

export async function refreshAccessToken(data: RefreshTokenInput) {
  const tokenHash = hashRefreshToken(data.refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!storedToken) {
    throw new AppError("Invalid refresh token", 401);
  }

  if (storedToken.revokedAt) {
    throw new AppError("Refresh token has been revoked", 401);
  }

  if (storedToken.expiresAt <= new Date()) {
    throw new AppError("Refresh token has expired", 401);
  }

  if (!storedToken.user.isActive) {
    throw new AppError("Account is inactive", 403);
  }

  const newAccessToken = createAccessToken(
    storedToken.user.id,
    storedToken.user.role,
  );

  const newRefreshToken = generateRefreshToken();

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    }),

    prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(newRefreshToken),
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!storedToken) {
    return;
  }

  if (storedToken.revokedAt) {
    return;
  }

  await prisma.refreshToken.update({
    where: {
      id: storedToken.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

