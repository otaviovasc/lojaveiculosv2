# CRM attendance notifications

The canonical external bot event `human_attendance_changed` reports AI pauses,
seller acknowledgement, and attendance end. Its payload includes
`humanAttendanceActive`, `humanAttendanceState`, and
`humanAttendanceStateVersion`. A seller acknowledging an AI pause emits
`IN_HUMAN_SERVICE` with the next attendance version.

Active-attendance notifications use `actionClass: notification` and `grant: null`.
They do not authorize bot actions. The action execution policy still rejects
operations during human attendance. Integration enablement, scoped revision
checks, payload privacy rules, and kill switches apply to notification enqueueing.

The outbox deduplicates notifications by scoped cycle and attendance version.
Its existing expiry column bounds notification delivery to 24 hours; there is
no capability grant to expire. Message events and attendance-end events keep their existing grant checks so
ending attendance can still authorize the existing bot summary workflow.
No database migration or environment change is required.

Validate an AI pause followed by a CRM seller response with the focused
`externalBotEventForwarding.test.ts` and `outboundAttendance.test.ts` tests.
After staging promotion, verify API/web build SHAs and run
`pnpm run release:smoke:staging`. Outbox acceptance is not proof that an
external consumer received the event.
