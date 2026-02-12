import { prisma } from "@/lib/prisma";

type UserRole = "customer" | "admin";

export interface AuthStoreUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

interface AuthStore {
  findByEmail(email: string): Promise<AuthStoreUser | null>;
  findById(userId: string): Promise<AuthStoreUser | null>;
  countUsers(): Promise<number>;
  createUser(input: Omit<AuthStoreUser, "id">): Promise<AuthStoreUser>;
}

const prismaAuthStore: AuthStore = {
  async findByEmail(email) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
    };
  },
  async findById(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
    };
  },
  countUsers() {
    return prisma.user.count();
  },
  async createUser(input) {
    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role,
      },
    });
    return {
      id: created.id,
      name: created.name,
      email: created.email,
      passwordHash: created.passwordHash,
      role: created.role as UserRole,
    };
  },
};

export async function resolveAuthStore(): Promise<AuthStore> {
  return prismaAuthStore;
}
