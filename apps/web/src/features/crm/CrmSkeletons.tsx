export function SessionListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="crm-cycle-list crm-skeleton-list"
      aria-label="Carregando conversas"
      role="status"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="crm-cycle crm-cycle-skeleton">
          <div className="crm-cycle-main">
            <div
              className="crm-avatar crm-skeleton"
              style={{
                width: "3.5rem",
                height: "3.5rem",
                borderRadius: "1rem",
              }}
            />
            <div className="min-w-0 flex-1 flex flex-col gap-2">
              <div className="crm-cycle-top flex justify-between items-center">
                <div className="crm-skeleton h-4 w-32 rounded-md" />
                <div className="crm-skeleton h-3 w-12 rounded-md" />
              </div>
              <div className="crm-cycle-preview-row flex justify-between items-center">
                <div className="crm-skeleton h-3.5 w-48 rounded-md" />
                {index % 2 === 0 ? (
                  <div className="crm-skeleton h-4 w-5 rounded-full" />
                ) : null}
              </div>
              <div className="crm-cycle-meta flex gap-1.5 mt-1">
                <div className="crm-skeleton h-4 w-16 rounded-md" />
                <div className="crm-skeleton h-4 w-20 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div
      className="crm-messages crm-messages-skeleton"
      aria-label="Carregando mensagens"
      role="status"
    >
      <div className="self-center crm-skeleton h-5 w-24 rounded-full my-2" />

      {/* Inbound bubble skeleton */}
      <div className="crm-bubble crm-skeleton-bubble flex flex-col gap-2 max-w-[20rem]">
        <div className="crm-skeleton h-3 w-20 rounded-md" />
        <div className="crm-skeleton h-4 w-56 rounded-md" />
        <div className="crm-skeleton h-4 w-40 rounded-md" />
        <div className="crm-skeleton h-2.5 w-10 self-end rounded-md" />
      </div>

      {/* Outbound bubble skeleton */}
      <div className="crm-bubble crm-bubble-out crm-skeleton-bubble flex flex-col gap-2 max-w-[22rem] self-end">
        <div className="crm-skeleton h-4 w-60 rounded-md" />
        <div className="crm-skeleton h-4 w-36 rounded-md" />
        <div className="crm-skeleton h-2.5 w-12 self-end rounded-md" />
      </div>

      {/* Inbound media card skeleton */}
      <div className="crm-bubble crm-skeleton-bubble flex flex-col gap-2 max-w-[18rem]">
        <div className="crm-skeleton h-32 w-full rounded-lg" />
        <div className="crm-skeleton h-3.5 w-44 rounded-md" />
        <div className="crm-skeleton h-2.5 w-10 self-end rounded-md" />
      </div>

      {/* Outbound reply skeleton */}
      <div className="crm-bubble crm-bubble-out crm-skeleton-bubble flex flex-col gap-2 max-w-[24rem] self-end">
        <div className="crm-skeleton h-10 w-full rounded-md opacity-75" />
        <div className="crm-skeleton h-4 w-64 rounded-md" />
        <div className="crm-skeleton h-4 w-48 rounded-md" />
        <div className="crm-skeleton h-2.5 w-12 self-end rounded-md" />
      </div>
    </div>
  );
}

export function DetailsPanelSkeleton() {
  return (
    <aside
      className="crm-details-panel crm-details-skeleton"
      aria-label="Carregando detalhes"
      role="status"
    >
      <header className="crm-details-header">
        <div className="crm-avatar crm-avatar-lg crm-skeleton" />
        <div className="crm-details-identity min-w-0 flex flex-col gap-1.5 flex-1">
          <div className="crm-skeleton h-3 w-16 rounded-md" />
          <div className="crm-skeleton h-4.5 w-36 rounded-md" />
          <div className="crm-skeleton h-3 w-28 rounded-md" />
        </div>
      </header>
      <div className="crm-details-section flex flex-col gap-3 py-4">
        <div className="crm-skeleton h-3 w-24 rounded-md" />
        <div className="crm-skeleton h-12 w-full rounded-lg" />
      </div>
      <div className="crm-details-section flex flex-col gap-3 py-4">
        <div className="crm-skeleton h-3 w-28 rounded-md" />
        <div className="crm-skeleton h-6 w-full rounded-md" />
        <div className="crm-skeleton h-6 w-full rounded-md" />
        <div className="crm-skeleton h-6 w-full rounded-md" />
      </div>
    </aside>
  );
}
