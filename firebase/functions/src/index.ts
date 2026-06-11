import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ============================================
// AUTOMATION: New Booking Workflow
// ============================================
export const onBookingCreated = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const booking = snap.data();
    const bookingId = context.params.bookingId;

    await db.collection("auditLogs").add({
      action: "booking_created",
      actorId: "system",
      actorRole: "system",
      resource: "bookings",
      resourceId: bookingId,
      metadata: { bookingNumber: booking.bookingNumber },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("workflows").add({
      name: "New Booking Workflow",
      trigger: "booking_created",
      steps: [
        { id: "1", action: "generate_invoice", status: "pending" },
        { id: "2", action: "send_whatsapp", status: "pending" },
        { id: "3", action: "send_email", status: "pending" },
        { id: "4", action: "update_crm", status: "pending" },
      ],
      status: "active",
      bookingId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("notifications").add({
      userId: booking.userId,
      type: "email",
      title: "Booking Confirmation",
      message: `Your booking ${booking.bookingNumber} has been received.`,
      sent: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("aiTasks").add({
      agentType: "booking",
      status: "pending",
      input: { bookingId, action: "process_booking" },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

// ============================================
// AUTOMATION: Payment Success Workflow
// ============================================
export const onPaymentSuccess = functions.firestore
  .document("payments/{paymentId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "paid" && after.status === "paid") {
      const bookingRef = db.collection("bookings").doc(after.bookingId);
      await bookingRef.update({
        paymentStatus: after.isDeposit ? "partial" : "paid",
        paidAmount: admin.firestore.FieldValue.increment(after.amount),
        status: "confirmed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("notifications").add({
        userId: after.userId,
        type: "whatsapp",
        title: "Payment Received",
        message: `Payment of ₹${after.amount} received for booking.`,
        sent: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

// ============================================
// AUTOMATION: Trip Complete Workflow
// ============================================
export const onBookingCompleted = functions.firestore
  .document("bookings/{bookingId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "completed" && after.status === "completed") {
      await db.collection("notifications").add({
        userId: after.userId,
        type: "email",
        title: "How was your trip?",
        message: "Please share your experience and get 10% off your next booking!",
        sent: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("aiTasks").add({
        agentType: "sales",
        status: "pending",
        input: { userId: after.userId, action: "post_trip_followup" },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

// ============================================
// AI: Scheduled Analytics Agent
// ============================================
export const scheduledAnalytics = functions.pubsub
  .schedule("0 6 * * *")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const bookingsSnap = await db
      .collection("bookings")
      .where("createdAt", ">=", getDaysAgo(30))
      .get();

    const totalRevenue = bookingsSnap.docs.reduce(
      (sum, doc) => sum + (doc.data().paidAmount || 0),
      0
    );

    await db.collection("analytics").doc("daily").set(
      {
        totalBookings: bookingsSnap.size,
        totalRevenue,
        computedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await db.collection("aiTasks").add({
      agentType: "analytics",
      status: "completed",
      input: { period: "daily" },
      output: { totalBookings: bookingsSnap.size, totalRevenue },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

// ============================================
// AI: Fraud Detection on New Booking
// ============================================
export const fraudCheckOnBooking = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const booking = snap.data();
    let riskScore = 0;
    const flags: string[] = [];

    const userBookings = await db
      .collection("bookings")
      .where("userId", "==", booking.userId)
      .get();

    if (userBookings.size > 5) {
      riskScore += 20;
      flags.push("high_booking_frequency");
    }

    if (booking.amount > 500000) {
      riskScore += 30;
      flags.push("high_value_booking");
    }

    if (riskScore >= 50) {
      await db.collection("auditLogs").add({
        action: "fraud_flagged",
        actorId: "system",
        actorRole: "system",
        resource: "bookings",
        resourceId: context.params.bookingId,
        metadata: { riskScore, flags },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await snap.ref.update({ fraudFlagged: true, fraudScore: riskScore });
    }
  });

// ============================================
// RBAC: Set Custom Claims on User Create
// ============================================
export const setUserRole = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const user = snap.data();
    const role = user.role || "customer";

    await admin.auth().setCustomUserClaims(context.params.userId, { role });
  });

function getDaysAgo(days: number): admin.firestore.Timestamp {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return admin.firestore.Timestamp.fromDate(date);
}
