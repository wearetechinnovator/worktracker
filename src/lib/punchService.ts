export interface AttendanceData {
  _id?: string;

  user_id?: string;

  attendance_date?: string;

  punch_in_on?: string | Date;

  punch_out_on?: string | Date | null;

  punch_in_ip?: string;

  punch_out_ip?: string | null;

  punch_in_geo?: any[];

  punch_out_geo?: any[];

  punch_in_reason?: string;

  punch_out_reason?: string | null;

  punch_in_browser?: string;

  punch_out_browser?: string | null;

  punch_in_systemid?: string | null;

  punch_out_systemid?: string | null;

  allow_punch_in_by?: string;

  allow_punch_out_by?: string;

  checkIn?: string | null;

  checkOut?: string | null;

  status?: string;

  checkInLocation?: string | null;
}

export interface PunchStatus {
  isPunchedIn: boolean;

  canPunchIn: boolean;

  canPunchOut: boolean;

  viewMode?: boolean;

  attendance: AttendanceData | null;

  pendingRequest?: any;
}

const STORAGE_KEY = "worktracker_punch_state";

/* =========================================================
   TYPES
========================================================= */

type PunchMeta = {
  reason?: string;

  geo?: any[];

  systemId?: string;
};

export type PunchError = Error & {
  requiresRequest?: boolean;

  requestType?: "punchIn" | "punchOut";

  currentTime?: string;

  punchInStartTime?: string | null;

  punchInEndTime?: string | null;

  punchOutStartTime?: string | null;

  punchOutEndTime?: string | null;

  errors?: string[];
};

/* =========================================================
   HELPERS
========================================================= */

function formatDisplayTime(
  dateInput?: string | Date | null
): string | null {
  if (!dateInput) {
    return null;
  }

  try {
    const d = new Date(dateInput);

    if (Number.isNaN(d.getTime())) {
      return null;
    }

    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

/* =========================================================
   NORMALIZE ATTENDANCE
========================================================= */

function normalizeAttendanceRecord(
  raw: any
): AttendanceData | null {
  if (!raw) {
    return null;
  }

  const punchInTime =
    raw.punch_in_on ||
    raw.checkIn;

  const punchOutTime =
    raw.punch_out_on ||
    raw.checkOut;

  return {
    ...raw,

    checkIn:
      formatDisplayTime(
        punchInTime
      ),

    checkOut:
      formatDisplayTime(
        punchOutTime
      ),

    status:
      raw.punch_out_on
        ? "Completed"
        : "Present",

    checkInLocation:
      raw.punch_in_ip
        ? `IP: ${raw.punch_in_ip}`
        : "Office / Remote",
  };
}

/* =========================================================
   API ERROR
========================================================= */

function createPunchError(
  data: any,
  fallbackMessage: string
): PunchError {
  const error =
    new Error(
      data?.message ||
        fallbackMessage
    ) as PunchError;

  error.requiresRequest =
    Boolean(
      data?.requiresRequest
    );

  error.requestType =
    data?.requestType;

  error.currentTime =
    data?.currentTime;

  error.punchInStartTime =
    data?.punchInStartTime;

  error.punchInEndTime =
    data?.punchInEndTime;

  error.punchOutStartTime =
    data?.punchOutStartTime;

  error.punchOutEndTime =
    data?.punchOutEndTime;

  error.errors =
    Array.isArray(
      data?.errors
    )
      ? data.errors
      : undefined;

  return error;
}

/* =========================================================
   LOCAL STORAGE
========================================================= */

function savePunchStatus(
  status: PunchStatus
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(status)
    );
  } catch (error) {
    console.error(
      "Failed to save punch status:",
      error
    );
  }
}

/* =========================================================
   EVENT DISPATCH
========================================================= */

/**
 * IMPORTANT:
 *
 * This function should ONLY be called
 * after a successful Punch In / Punch Out.
 *
 * DO NOT call this from fetchPunchStatus().
 */
function dispatchPunchEvents(
  status: PunchStatus
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      "punch-status-changed",
      {
        detail: status,
      }
    )
  );

  window.dispatchEvent(
    new Event(
      "punchStateChanged"
    )
  );
}

/* =========================================================
   SAVE + EVENT
========================================================= */

function updateLocalPunchState(
  status: PunchStatus
) {
  savePunchStatus(status);

  dispatchPunchEvents(status);
}

/* =========================================================
   PUNCH SERVICE
========================================================= */

export const punchService = {
  /* =======================================================
     GET CACHED STATUS
  ======================================================= */

  getPunchStatus(): PunchStatus {
    if (
      typeof window ===
      "undefined"
    ) {
      return {
        isPunchedIn: false,

        canPunchIn: true,

        canPunchOut: false,

        viewMode: true,

        attendance: null,
      };
    }

    const stored =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (stored) {
      try {
        const parsed =
          JSON.parse(stored);

        return {
          isPunchedIn:
            Boolean(
              parsed.isPunchedIn
            ),

          canPunchIn:
            !parsed.isPunchedIn,

          canPunchOut:
            Boolean(
              parsed.isPunchedIn
            ),

          viewMode:
            parsed.viewMode !==
            undefined
              ? Boolean(
                  parsed.viewMode
                )
              : !parsed.isPunchedIn,

          attendance:
            parsed.attendance ||
            null,
        };
      } catch (error) {
        console.error(
          "Failed to parse cached punch status:",
          error
        );
      }
    }

    return {
      isPunchedIn: false,

      canPunchIn: true,

      canPunchOut: false,

      viewMode: true,

      attendance: null,

      pendingRequest: null,
    };
  },

  /* =======================================================
     FETCH FROM API
     
     IMPORTANT:
     GET REQUEST DOES NOT DISPATCH EVENTS.
  ======================================================= */

  async fetchPunchStatus(): Promise<PunchStatus> {
    try {
      const res =
        await fetch(
          "/api/attendance/punch",
          {
            method: "GET",

            credentials:
              "include",

            cache: "no-store",
          }
        );

      const data =
        await res.json();

      if (
        res.status === 401
      ) {
        throw new Error(
          "Authentication required"
        );
      }

      if (
        res.ok &&
        data.success
      ) {
        const normalizedAttendance =
          normalizeAttendanceRecord(
            data.attendance
          );

        const status: PunchStatus = {
          isPunchedIn:
            Boolean(
              data.isPunchedIn
            ),

          canPunchIn:
            data.canPunchIn !==
            undefined
              ? Boolean(
                  data.canPunchIn
                )
              : !data.isPunchedIn,

          canPunchOut:
            data.canPunchOut !==
            undefined
              ? Boolean(
                  data.canPunchOut
                )
              : Boolean(
                  data.isPunchedIn
                ),

          viewMode:
            data.viewMode !==
            undefined
              ? Boolean(
                  data.viewMode
                )
              : !data.isPunchedIn,

          attendance:
            normalizedAttendance,

          pendingRequest:
            data.pendingRequest || null,
        };

        /*
         * IMPORTANT FIX
         *
         * Only cache the result.
         *
         * DO NOT use:
         *
         * updateLocalPunchState(status)
         *
         * because that dispatches
         * punch-status-changed.
         */

        savePunchStatus(
          status
        );

        return status;
      }

      throw createPunchError(
        data,
        "Failed to fetch punch status"
      );
    } catch (error) {
      console.error(
        "Error fetching punch status from API:",
        error
      );

      /*
       * API failed temporarily.
       * Return cached state.
       */
      return this.getPunchStatus();
    }
  },

  /* =======================================================
     PUNCH IN
  ======================================================= */

  async punchIn(
    meta?: PunchMeta
  ): Promise<PunchStatus> {
    try {
      const res =
        await fetch(
          "/api/attendance/punch",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "include",

            body: JSON.stringify({
              action:
                "punchIn",

              reason:
                meta?.reason ||
                "Regular shift punch in",

              geo:
                meta?.geo ||
                [],

              systemId:
                meta?.systemId ||
                null,
            }),
          }
        );

      const data =
        await res.json();

      if (
        res.ok &&
        data.success
      ) {
        const normalizedAttendance =
          normalizeAttendanceRecord(
            data.attendance
          );

        const status: PunchStatus = {
          isPunchedIn: true,

          canPunchIn: false,

          canPunchOut: true,

          viewMode: false,

          attendance:
            normalizedAttendance,
        };

        /*
         * SUCCESS ONLY
         *
         * This is where event
         * dispatch is allowed.
         */
        updateLocalPunchState(
          status
        );

        return status;
      }

      throw createPunchError(
        data,
        "Failed to punch in"
      );
    } catch (error) {
      console.error(
        "Punch in error:",
        error
      );

      throw error;
    }
  },

  /* =======================================================
     PUNCH OUT
  ======================================================= */

  async punchOut(
    meta?: PunchMeta
  ): Promise<PunchStatus> {
    try {
      const res =
        await fetch(
          "/api/attendance/punch",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "include",

            body: JSON.stringify({
              action:
                "punchOut",

              reason:
                meta?.reason ||
                "Shift completion punch out",

              geo:
                meta?.geo ||
                [],

              systemId:
                meta?.systemId ||
                null,
            }),
          }
        );

      const data =
        await res.json();

      if (
        res.ok &&
        data.success
      ) {
        const normalizedAttendance =
          normalizeAttendanceRecord(
            data.attendance
          );

        const status: PunchStatus = {
          isPunchedIn: false,

          canPunchIn: true,

          canPunchOut: false,

          viewMode:
            data.viewMode !==
            undefined
              ? Boolean(
                  data.viewMode
                )
              : true,

          attendance:
            normalizedAttendance,
        };

        /*
         * SUCCESS ONLY
         *
         * Event dispatch allowed here.
         */
        updateLocalPunchState(
          status
        );

        return status;
      }

      throw createPunchError(
        data,
        "Failed to punch out"
      );
    } catch (error) {
      console.error(
        "Punch out error:",
        error
      );

      throw error;
    }
  },

  /* =======================================================
     REQUEST PUNCH
  ======================================================= */

  async requestPunch(
    requestType:
      | "punchIn"
      | "punchOut",

    reason: string,

    meta?: {
      geo?: any[];

      systemId?: string;
    }
  ) {
    const trimmedReason =
      String(
        reason || ""
      ).trim();

    if (!trimmedReason) {
      throw new Error(
        "Reason is required."
      );
    }

    try {
      const res =
        await fetch(
          "/api/attendance/request",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "include",

            body: JSON.stringify({
              requestType,

              reason:
                trimmedReason,

              geo:
                meta?.geo ||
                [],

              systemId:
                meta?.systemId ||
                null,
            }),
          }
        );

      const data =
        await res.json();

      if (
        !res.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to submit attendance request."
        );
      }

      return data;
    } catch (error) {
      console.error(
        "Attendance request error:",
        error
      );

      throw error;
    }
  },

  /* =======================================================
     TOGGLE PUNCH
  ======================================================= */

  async togglePunchAsync(
    meta?: PunchMeta
  ): Promise<PunchStatus> {
    /*
     * Get latest server state.
     *
     * fetchPunchStatus() DOES NOT dispatch
     * any event anymore.
     */

    const current =
      await this.fetchPunchStatus();

    if (
      current.isPunchedIn
    ) {
      return await this.punchOut(
        meta
      );
    }

    return await this.punchIn(
      meta
    );
  },

  /* =======================================================
     BACKWARD COMPATIBLE TOGGLE
  ======================================================= */

  async togglePunch(
    meta?: PunchMeta
  ): Promise<PunchStatus> {
    return await this.togglePunchAsync(
      meta
    );
  },

  /* =======================================================
     CLEAR LOCAL CACHE
  ======================================================= */

  clearLocalPunchStatus() {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    try {
      localStorage.removeItem(
        STORAGE_KEY
      );
    } catch (error) {
      console.error(
        "Failed to clear punch status:",
        error
      );
    }

    const emptyStatus: PunchStatus =
      {
        isPunchedIn: false,

        canPunchIn: true,

        canPunchOut: false,

        viewMode: true,

        attendance: null,
      };

    /*
     * Explicitly dispatch because
     * this is a real state reset.
     */
    dispatchPunchEvents(
      emptyStatus
    );
  },
};