import { authenticateRequest } from "@/lib/auth/server-auth";
import {
  calculateMaxRedeemablePoints,
  calculateRewardDiscount,
  getCustomerRewards,
} from "@/lib/rewards/rewards-service";
import {
  MAX_REDEEM_PERCENT,
  MIN_REDEEM_POINTS,
  POINT_VALUE_INR,
  REWARD_POINTS_PER_RUPEE,
} from "@/lib/rewards/constants";
import { apiError, apiSuccess } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) return auth.error;
    if (auth.user.role !== "customer") {
      return apiError("Only customers can access rewards.", 403);
    }

    const rewards = await getCustomerRewards(auth.user.id);

    return apiSuccess({
      ...rewards,
      rules: {
        earnRate: `Earn ${Math.round(REWARD_POINTS_PER_RUPEE * 100)} point per ₹100 paid`,
        pointValue: `1 point = ₹${POINT_VALUE_INR} off`,
        minRedeem: MIN_REDEEM_POINTS,
        maxRedeemPercent: Math.round(MAX_REDEEM_PERCENT * 100),
      },
    });
  } catch (error) {
    console.error("Customer rewards GET error:", error);
    return apiError("Failed to load rewards", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) return auth.error;
    if (auth.user.role !== "customer") {
      return apiError("Only customers can preview rewards.", 403);
    }

    const body = (await request.json().catch(() => ({}))) as {
      bookingAmount?: number;
      pointsToRedeem?: number;
    };

    const bookingAmount = Number(body.bookingAmount ?? 0);
    if (!bookingAmount || bookingAmount <= 0) {
      return apiError("bookingAmount is required", 400);
    }

    const rewards = await getCustomerRewards(auth.user.id);
    const maxPoints = calculateMaxRedeemablePoints(
      rewards.rewardPoints,
      bookingAmount
    );
    const requested = Math.floor(Number(body.pointsToRedeem ?? maxPoints));
    const appliedPoints = Math.min(requested, maxPoints);
    const discount = calculateRewardDiscount(appliedPoints);
    const payable = Math.max(1, bookingAmount - discount);

    return apiSuccess({
      availablePoints: rewards.rewardPoints,
      maxRedeemablePoints: maxPoints,
      appliedPoints,
      discount,
      payableAmount: payable,
      canRedeem: rewards.rewardPoints >= MIN_REDEEM_POINTS && maxPoints >= MIN_REDEEM_POINTS,
    });
  } catch (error) {
    console.error("Customer rewards quote error:", error);
    return apiError("Failed to calculate reward quote", 500);
  }
}
