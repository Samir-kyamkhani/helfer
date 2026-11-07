import { ArrowUp, ChevronDown, Mic, Plus, SquareKanban } from "lucide-react";

const suggestions = [
  "Design a blog database and document each table",
  "Map out a user onboarding flow",
  "Plan the architecture for a chat app",
];

const workspaces = [
  {
    title: "Build a Small Restaurant / Food Stall Online",
    text: "Build a Small Restaurant / Food Stall Online Ordering Platform. Act as a senior full-stack…",
  },
  {
    title: "Design a blog database and document each table",
    text: "Tables, relations and an ER canvas for a multi-author blog.",
  },
  {
    title: "Plan the architecture for a chat app",
    text: "Services, queues and a sequence diagram for real-time messaging.",
  },
];

/* Static, non-interactive replica of the real /dashboard screen.
   Same shell as the feature mocks so the hero matches the rest of the page. */
export function DashboardMock() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-xl"
    >
      {/* Browser bar */}
      <div className="flex min-h-10 items-center gap-3 border-b border-border bg-surface px-3 sm:px-4">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </div>
        <span className="mx-auto truncate rounded-md border border-border bg-card px-3 py-1 font-mono text-[9px] text-muted-foreground sm:text-[10px]">
          helfer.app/dashboard
        </span>
        <span className="w-10 shrink-0 sm:w-12" />
      </div>

      {/* App nav */}
      <div className="flex h-12 items-center gap-3 border-b border-border bg-card px-4 sm:h-14 sm:px-6">
        <span className="font-heading text-sm font-bold tracking-tight text-foreground sm:text-base">
          HELFER
        </span>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-foreground/80 sm:gap-5 sm:text-xs">
          <span className="inline-flex items-center gap-1">
            Personal
            <ChevronDown className="size-3" />
          </span>
          <span className="hidden text-muted-foreground sm:inline">Teams</span>
          <span className="font-medium text-foreground">Pro</span>
          <span className="hidden font-mono text-muted-foreground sm:inline">
            1/2,000
          </span>
          <span className="size-6 rounded-full bg-brand-soft ring-1 ring-border-strong sm:size-7" />
        </div>
      </div>

      {/* Prompt area */}
      <div className="topo-bg px-4 pb-8 pt-10 text-center sm:px-8 sm:pb-12 sm:pt-14">
        <h3 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          What are we planning today?
        </h3>
        <p className="mt-2 text-[11px] text-muted-foreground sm:text-sm">
          Describe it, and the agent drafts the doc and the canvas for you.
        </p>

        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-border-strong bg-card p-3 text-left shadow-lg sm:mt-8 sm:p-4">
          <p className="min-h-10 text-[11px] text-muted-foreground/70 sm:min-h-12 sm:text-sm">
            e.g. Design the database for a food delivery app and document it
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-muted-foreground sm:text-[11px]">
              Shift + Enter for a new line
            </span>
            <Mic className="ml-auto size-3.5 text-foreground/70 sm:size-4" />
            <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground sm:size-8">
              <ArrowUp className="size-3 sm:size-4" />
            </span>
          </div>
        </div>

        <ul className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-x-5 gap-y-1.5 text-[9px] text-muted-foreground sm:text-xs">
          {suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      {/* Recent workspaces */}
      <div className="border-t border-border bg-card px-4 py-5 sm:px-8 sm:py-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[9px] text-muted-foreground sm:text-[11px]">
              Personal
            </p>
            <h4 className="font-heading text-sm font-semibold tracking-tight text-foreground sm:text-lg">
              Recent workspaces
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[9px] sm:text-xs">
            <span className="hidden items-center gap-1.5 text-muted-foreground sm:inline-flex">
              <SquareKanban className="size-3.5" />
              View board (1)
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-card px-2.5 py-1.5 font-medium text-foreground shadow-xs">
              <Plus className="size-3" />
              New workspace
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {workspaces.map((w, i) => (
            <div
              key={w.title}
              className={`rounded-xl border border-border bg-surface p-3 shadow-xs sm:p-4 ${
                i === 2 ? "hidden sm:block" : ""
              }`}
            >
              <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-foreground sm:text-sm">
                {w.title}
              </p>
              <p className="mt-1.5 line-clamp-2 text-[9px] leading-4 text-muted-foreground sm:text-xs">
                {w.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
