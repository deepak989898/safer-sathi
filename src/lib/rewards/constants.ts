/** Earn 1 point per ₹100 actually paid (minimum 10 points per confirmed booking). */
export const REWARD_POINTS_PER_RUPEE = 0.01;

export const MIN_EARN_POINTS = 10;

/** Each point is worth ₹1 off the booking total. */
export const POINT_VALUE_INR = 1;

/** Minimum points required to redeem. */
export const MIN_REDEEM_POINTS = 50;

/** Max share of booking total that can be paid with points (20%). */
export const MAX_REDEEM_PERCENT = 0.2;

/** Points reserved on pending booking; refunded if payment fails. */
export const REWARD_TX_COLLECTION = "reward_transactions";
