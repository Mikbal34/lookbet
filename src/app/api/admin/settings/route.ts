import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { systemSettingSchema } from "@/lib/validators";
import { z } from "zod";

const settingsUpdateSchema = z.array(systemSettingSchema);

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[ADMIN_SETTINGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = settingsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed. Expected an array of {key, value, description?}", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const settingsData = parsed.data;

    // Fetch old settings for audit log
    const keys = settingsData.map((s) => s.key);
    const oldSettings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });

    const oldSettingsMap = Object.fromEntries(
      oldSettings.map((s: { key: string; value: string }) => [s.key, s.value])
    );

    // Upsert all settings in a transaction
    const updatedSettings = await prisma.$transaction(
      settingsData.map((setting) =>
        prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            ...(setting.description !== undefined && { description: setting.description }),
          },
          create: {
            key: setting.key,
            value: setting.value,
            description: setting.description,
          },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_SETTINGS",
        entity: "SystemSetting",
        oldData: oldSettingsMap,
        newData: Object.fromEntries(settingsData.map((s) => [s.key, s.value])),
      },
    });

    return NextResponse.json({ settings: updatedSettings });
  } catch (error) {
    console.error("[ADMIN_SETTINGS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
