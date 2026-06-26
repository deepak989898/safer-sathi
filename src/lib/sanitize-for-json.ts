/** Make Firestore / server values safe for NextResponse.json (avoids HTML 500 pages). */
export function sanitizeForJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => {
      if (current === undefined) return null;
      if (current === null || typeof current !== "object") return current;

      if (typeof (current as { toDate?: () => Date }).toDate === "function") {
        return (current as { toDate: () => Date }).toDate().toISOString();
      }

      if (
        typeof (current as { _seconds?: number })._seconds === "number" &&
        typeof (current as { _nanoseconds?: number })._nanoseconds === "number"
      ) {
        const { _seconds, _nanoseconds } = current as {
          _seconds: number;
          _nanoseconds: number;
        };
        return new Date(_seconds * 1000 + _nanoseconds / 1_000_000).toISOString();
      }

      return current;
    })
  ) as T;
}
