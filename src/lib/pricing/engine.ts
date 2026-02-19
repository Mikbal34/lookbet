import { prisma } from "@/lib/prisma";

type PriceRuleType = "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "MARKUP";
type PriceRuleTarget = "ALL_AGENCIES" | "SPECIFIC_AGENCY" | "ALL_CUSTOMERS";

interface PriceInput {
  basePrice: number;
  userType: "CUSTOMER" | "AGENCY" | "ADMIN";
  agencyId?: string;
  hotelCode?: string;
  boardType?: string;
  currency?: string;
}

interface AppliedRule {
  ruleId: string;
  name: string;
  type: PriceRuleType;
  value: number;
  discountAmount: number;
}

interface PriceResult {
  originalPrice: number;
  finalPrice: number;
  totalDiscount: number;
  appliedRules: AppliedRule[];
  commissionAmount: number;
}

export async function calculatePrice(input: PriceInput): Promise<PriceResult> {
  const { basePrice, userType, agencyId, hotelCode, boardType } = input;
  const now = new Date();

  let finalPrice = basePrice;
  const appliedRules: AppliedRule[] = [];
  let totalDiscount = 0;

  // Fetch active price rules matching criteria, ordered by priority desc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andConditions: any[] = [
    { OR: [{ startDate: null }, { startDate: { lte: now } }] },
    { OR: [{ endDate: null }, { endDate: { gte: now } }] },
  ];

  if (userType === "AGENCY" && agencyId) {
    andConditions.push({
      OR: [
        { appliesTo: "ALL_AGENCIES" },
        { appliesTo: "SPECIFIC_AGENCY", agencyId },
      ],
    });
  } else if (userType === "CUSTOMER") {
    andConditions.push({ appliesTo: "ALL_CUSTOMERS" });
  }

  if (hotelCode) {
    andConditions.push({ OR: [{ hotelCode: null }, { hotelCode }] });
  }
  if (boardType) {
    andConditions.push({ OR: [{ boardType: null }, { boardType }] });
  }

  const rules = await prisma.priceRule.findMany({
    where: {
      isActive: true,
      AND: andConditions,
    },
    orderBy: { priority: "desc" },
  });

  // Apply highest priority rule only
  if (rules.length > 0) {
    const rule = rules[0];
    let discountAmount = 0;

    switch (rule.type) {
      case "PERCENTAGE_DISCOUNT":
        discountAmount = basePrice * (rule.value / 100);
        finalPrice = basePrice - discountAmount;
        break;
      case "FIXED_DISCOUNT":
        discountAmount = rule.value;
        finalPrice = basePrice - discountAmount;
        break;
      case "MARKUP":
        discountAmount = -(basePrice * (rule.value / 100));
        finalPrice = basePrice + basePrice * (rule.value / 100);
        break;
    }

    totalDiscount += discountAmount;
    appliedRules.push({
      ruleId: rule.id,
      name: rule.name,
      type: rule.type,
      value: rule.value,
      discountAmount,
    });
  }

  // Apply agency-specific discount rate
  if (userType === "AGENCY" && agencyId) {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (agency && agency.discountRate > 0) {
      const agencyDiscount = finalPrice * (agency.discountRate / 100);
      finalPrice -= agencyDiscount;
      totalDiscount += agencyDiscount;
      appliedRules.push({
        ruleId: `agency-${agencyId}`,
        name: `Acente İndirimi (${agency.companyName})`,
        type: "PERCENTAGE_DISCOUNT",
        value: agency.discountRate,
        discountAmount: agencyDiscount,
      });
    }
  }

  // Calculate commission
  let commissionAmount = 0;
  if (userType === "AGENCY" && agencyId) {
    commissionAmount = await calculateCommission(agencyId, finalPrice, hotelCode, boardType);
  }

  // Ensure price doesn't go below 0
  finalPrice = Math.max(0, finalPrice);

  return {
    originalPrice: basePrice,
    finalPrice: Math.round(finalPrice * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    appliedRules,
    commissionAmount: Math.round(commissionAmount * 100) / 100,
  };
}

async function calculateCommission(
  agencyId: string,
  price: number,
  hotelCode?: string,
  boardType?: string
): Promise<number> {
  const now = new Date();

  const commissions = await prisma.commission.findMany({
    where: {
      agencyId,
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        { OR: [{ hotelCode: null }, ...(hotelCode ? [{ hotelCode }] : [])] },
        { OR: [{ boardType: null }, ...(boardType ? [{ boardType }] : [])] },
      ],
    },
  });

  if (commissions.length === 0) return 0;

  // Use the most specific commission (with hotelCode match first)
  const commission =
    commissions.find((c: { hotelCode: string | null; boardType: string | null }) => c.hotelCode && c.boardType) ||
    commissions.find((c: { hotelCode: string | null }) => c.hotelCode) ||
    commissions.find((c: { boardType: string | null }) => c.boardType) ||
    commissions[0];

  if (commission.type === "PERCENTAGE") {
    return price * (commission.value / 100);
  }
  return commission.value;
}
