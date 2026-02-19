import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createNotificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.string().min(1, "Type is required"),
  // Provide either userId (single user) or targetRole (broadcast to all users of that role)
  userId: z.string().optional(),
  targetRole: z.enum(["CUSTOMER", "AGENCY", "ADMIN"]).optional(),
}).refine(
  (data) => data.userId || data.targetRole,
  { message: "Either userId or targetRole must be provided" }
);

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const isReadParam = searchParams.get("isRead");
    const userId = searchParams.get("userId");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }

    if (isReadParam !== null) {
      where.isRead = isReadParam === "true";
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_NOTIFICATIONS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, message, type, userId, targetRole } = parsed.data;

    // Broadcast to all users of a specific role
    if (targetRole) {
      const users = await prisma.user.findMany({
        where: { role: targetRole, isActive: true },
        select: { id: true },
      });

      if (users.length === 0) {
        return NextResponse.json(
          { error: "No active users found for the specified role" },
          { status: 404 }
        );
      }

      await prisma.notification.createMany({
        data: users.map((u: { id: string }) => ({
          userId: u.id,
          type,
          title,
          message,
        })),
      });

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "BROADCAST_NOTIFICATION",
          entity: "Notification",
          newData: { targetRole, title, type, recipientCount: users.length },
        },
      });

      return NextResponse.json(
        { message: `Notification sent to ${users.length} users with role ${targetRole}` },
        { status: 201 }
      );
    }

    // Send to a single user
    const userExists = await prisma.user.findUnique({ where: { id: userId! } });
    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: userId!,
        type,
        title,
        message,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_NOTIFICATION",
        entity: "Notification",
        entityId: notification.id,
        newData: { userId, title, type },
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_NOTIFICATIONS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
