import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  FileText,
  Heart,
  MessageSquareText,
  MousePointer2,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { landingCopy } from "./_data/landing";

type LandingFeature = (typeof landingCopy.features.rows)[number];
type LandingStep = (typeof landingCopy.howItWorks.steps)[number];
type CanvasPreview = Extract<LandingFeature["mock"], { kind: "canvas" }>;
type DocsPreview = Extract<LandingFeature["mock"], { kind: "docs" }>;
type TeamBoardPreview = Extract<LandingFeature["mock"], { kind: "team-board" }>;

const featureIcons: Record<LandingFeature["id"], LucideIcon> = {
  canvas: Workflow,
  docs: FileText,
  "team-board": UsersRound,
};

const stepIcons: Record<LandingStep["id"], LucideIcon> = {
  describe: MessageSquareText,
  draw: Workflow,
  iterate: UsersRound,
};

function PreviewHeader({
  workspace,
  status,
}: {
  workspace: string;
  status: string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 px-3 sm:px-4">
      <div aria-hidden="true" className="flex gap-1.5">
        <span className="size-2 rounded-full bg-white/20" />
        <span className="size-2 rounded-full bg-white/20" />
        <span className="size-2 rounded-full bg-white/20" />
      </div>
      <span className="truncate font-mono text-[9px] tracking-[0.12em] text-white/55 sm:text-[10px]">
        {workspace}
      </span>
      <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[8px] text-white/70 sm:text-[9px]">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
        {status}
      </span>
    </div>
  );
}

function CanvasMock({ preview }: { preview: CanvasPreview }) {
  const nodePositions = [
    "left-[2%] top-[42%]",
    "left-[35%] top-[42%]",
    "left-[68%] top-[22%]",
    "left-[68%] top-[66%]",
  ];

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/30"
    >
      <PreviewHeader workspace={preview.workspace} status={preview.status} />
      <div className="relative aspect-[1.65] min-h-64 overflow-hidden bg-white/2.5">
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          viewBox="0 0 600 300"
        >
          <defs>
            <pattern
              id="canvas-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="#ffffff" fillOpacity="0.14" />
            </pattern>
          </defs>
          <rect width="600" height="300" fill="url(#canvas-grid)" />
          <path
            d="M192 150 H210 M390 150 H418 V88 H408 M390 150 H418 V214 H408"
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            opacity="0.22"
          />
        </svg>

        {preview.nodes.map((node, index) => (
          <div
            key={node.label}
            className={`absolute z-10 flex min-h-11 w-[30%] items-center gap-1.5 rounded-lg border px-2 py-2 text-[9px] font-medium leading-tight text-white/75 shadow-sm sm:gap-2 sm:px-3 sm:text-[10px] ${nodePositions[index]} ${
              node.kind === "decision"
                ? "border-primary/45 bg-primary/10"
                : "border-white/10 bg-white/4.5"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-sm ${
                node.kind === "decision"
                  ? "rotate-45 bg-primary"
                  : "bg-white/25"
              }`}
            />
            <span className="min-w-0">{node.label}</span>
          </div>
        ))}

        <span className="absolute left-[57%] top-[25%] z-20 rounded bg-zinc-900/90 px-1.5 py-0.5 font-mono text-[8px] text-white/50 shadow-sm">
          {preview.branches.yes}
        </span>
        <span className="absolute left-[57%] top-[69%] z-20 rounded bg-zinc-900/90 px-1.5 py-0.5 font-mono text-[8px] text-white/50 shadow-sm">
          {preview.branches.no}
        </span>
      </div>
      <div className="border-t border-white/8 px-3 py-2 font-mono text-[9px] text-white/45 sm:px-4">
        {preview.footer}
      </div>
    </div>
  );
}

function DocsMock({ preview }: { preview: DocsPreview }) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/30"
    >
      <PreviewHeader workspace={preview.workspace} status={preview.status} />
      <div className="m-2 rounded-xl border border-white/8 bg-white/2.5 px-5 py-6 text-foreground/80 sm:m-3 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-2 text-white/45">
            <FileText aria-hidden="true" className="size-4" />
            <span className="font-mono text-[9px] tracking-[0.12em]">
              {preview.workspace}
            </span>
          </div>
          <h3 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {preview.title}
          </h3>
          <p className="mt-3 max-w-md text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">
            {preview.intro}
          </p>
          <div className="mt-6 rounded-r-lg border-l-2 border-primary bg-white/4.5 px-4 py-3 sm:mt-7 sm:px-5 sm:py-4">
            <h4 className="text-xs font-semibold text-foreground sm:text-sm">
              {preview.sectionTitle}
            </h4>
            <p className="mt-2 text-[11px] leading-5 text-white/55 sm:text-xs sm:leading-6">
              {preview.sectionText}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-2.5 shadow-sm sm:mt-6 sm:px-4">
            <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[9px] text-primary">
              {preview.summaryLabel}
            </span>
            <span className="text-[10px] text-white/50 sm:text-[11px]">
              {preview.summary}
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="ml-auto size-3.5 text-white/35"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamBoardMock({ preview }: { preview: TeamBoardPreview }) {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/30"
    >
      <PreviewHeader workspace={preview.workspace} status={preview.status} />
      <div className="relative grid min-h-64 grid-cols-3 gap-2 border-t border-white/8 bg-white/2.5 p-3 sm:gap-3 sm:p-4">
        {preview.columns.map((column) => (
          <div
            key={column.title}
            className="min-w-0 rounded-xl border border-white/8 bg-white/2.5 p-2 sm:p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-1 sm:mb-3">
              <span className="truncate text-[9px] font-medium text-white/75 sm:text-[11px]">
                {column.title}
              </span>
              <span className="font-mono text-[8px] text-white/35 sm:text-[9px]">
                {column.count}
              </span>
            </div>
            <div className="space-y-2">
              {column.cards.map((card) => (
                <div
                  key={card}
                  className="min-h-14 rounded-lg border border-white/8 bg-white/4.5 p-2 sm:min-h-16 sm:p-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="mb-2 block h-1 w-6 rounded-full bg-primary/75 sm:w-8"
                  />
                  <span className="block truncate text-[8px] leading-4 text-white/70 sm:text-[10px]">
                    {card}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="absolute left-[43%] top-[47%] flex items-center gap-1 text-sky-300 drop-shadow-md">
          <MousePointer2 aria-hidden="true" className="size-4 fill-sky-300" />
          <span className="rounded-full bg-sky-400 px-2 py-1 text-[8px] font-medium text-slate-950">
            {preview.cursorLabels[0]}
          </span>
        </div>
        <div className="absolute bottom-[12%] right-[13%] flex items-center gap-1 text-primary drop-shadow-md">
          <MousePointer2 aria-hidden="true" className="size-4 fill-primary" />
          <span className="rounded-full bg-primary px-2 py-1 text-[8px] font-medium text-primary-foreground">
            {preview.cursorLabels[1]}
          </span>
        </div>
      </div>
    </div>
  );
}

function SurfaceMockup({ feature }: { feature: LandingFeature }) {
  switch (feature.mock.kind) {
    case "canvas":
      return <CanvasMock preview={feature.mock} />;
    case "docs":
      return <DocsMock preview={feature.mock} />;
    case "team-board":
      return <TeamBoardMock preview={feature.mock} />;
  }
}

export default function Home() {
  const { hero, audience, features, howItWorks, pricing, closingCta, footer } =
    landingCopy;

  return (
    <>
      <main>
        <section className="topo-bg relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-6 py-24 md:px-10">
          <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
            <p className="mb-8 inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground sm:mb-10">
              <span
                aria-hidden="true"
                className="size-2 rotate-45 border border-primary bg-primary/30"
              />
              {hero.eyebrow}
            </p>

            <h1 className="max-w-4xl text-balance font-heading text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              {hero.headline.before}{" "}
              <span className="text-primary">{hero.headline.highlight}</span>{" "}
              {hero.headline.after}
              <br className="hidden sm:block" /> {hero.headline.finalLine}
            </h1>

            <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:mt-8 sm:text-lg sm:leading-8">
              {hero.subtitle}
            </p>

            <div className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-12 gap-2 rounded-xl px-6 text-sm shadow-[0_0_32px_oklch(0.74_0.16_55/0.18)] sm:text-[0.95rem]"
              >
                <Link href={hero.primaryAction.href}>
                  {hero.primaryAction.label}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/12 bg-background/35 px-6 text-sm backdrop-blur-sm hover:bg-white/6 sm:text-[0.95rem]"
              >
                <Link href={hero.secondaryAction.href}>
                  {hero.secondaryAction.label}
                </Link>
              </Button>
            </div>

            <div className="survey-frame scroll-tilt mt-20 w-full max-w-5xl">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl shadow-black/40">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/videos/hero-poster.jpg"
                  aria-label={hero.videoAlt}
                  className="aspect-video w-full object-cover"
                >
                  <source src="/videos/hero.webm" type="video/webm" />
                  <source src="/videos/hero.mp4" type="video/mp4" />
                  {hero.videoFallback}
                </video>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label={audience.label}
          className="border-y border-white/8 bg-white/1.5`tailwindcss(suggestCanonicalClasses) px-6 py-6 md:px-10"
        >
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <p className="shrink-0 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {audience.label}
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:gap-x-7">
              {audience.groups.map((group) => (
                <li
                  key={group}
                  className="inline-flex items-center gap-2 text-sm text-foreground/75"
                >
                  <span
                    aria-hidden="true"
                    className="size-1 rounded-full bg-primary/70"
                  />
                  {group}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="product"
          className="scroll-mt-20 px-6 pb-28 pt-24 md:px-10 md:pb-36 md:pt-32"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-14 max-w-3xl text-center sm:mb-20">
              <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                {features.eyebrow}
              </p>
              <h2 className="text-balance font-heading text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl md:text-6xl">
                {features.heading}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {features.subtitle}
              </p>
            </div>

            <div className="divide-y divide-white/8 border-y border-white/8">
              {features.rows.map((feature) => {
                const Icon = featureIcons[feature.id];
                const copyOrder =
                  feature.layout === "mock-first"
                    ? "order-1 lg:order-2"
                    : "order-1";
                const mockOrder =
                  feature.layout === "mock-first"
                    ? "order-2 lg:order-1"
                    : "order-2";

                return (
                  <article
                    key={feature.id}
                    className="grid items-center gap-10 py-14 sm:gap-12 sm:py-20 lg:grid-cols-2 lg:gap-20 lg:py-24"
                  >
                    <div className={`max-w-xl ${copyOrder}`}>
                      <div className="mb-6 flex items-center gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/8 text-primary">
                          <Icon aria-hidden="true" className="size-5" />
                        </span>
                        <h3 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                        {feature.description}
                      </p>
                      <ul className="mt-7 space-y-3 sm:mt-8">
                        {feature.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="flex items-start gap-3 text-sm leading-6 text-foreground/80 sm:text-[0.95rem]"
                          >
                            <span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                              <Check aria-hidden="true" className="size-2.5" />
                            </span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className={`w-full min-w-0 ${mockOrder}`}>
                      <SurfaceMockup feature={feature} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-20 border-t border-white/8 px-6 py-24 md:px-10 md:py-32"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-14 max-w-3xl text-center sm:mb-20">
              <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                {howItWorks.eyebrow}
              </p>
              <h2 className="text-balance font-heading text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl md:text-6xl">
                {howItWorks.heading}
              </h2>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute bottom-6 left-6 top-6 border-l border-dashed border-primary/35 lg:bottom-auto lg:left-[16%] lg:right-[16%] lg:top-6 lg:border-l-0 lg:border-t"
              />
              <ol className="relative grid gap-8 lg:grid-cols-3 lg:gap-8">
                {howItWorks.steps.map((step) => {
                  const Icon = stepIcons[step.id];

                  return (
                    <li
                      key={step.id}
                      className="relative flex gap-5 lg:flex-col lg:items-center lg:gap-6 lg:text-center"
                    >
                      <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full border border-primary/45 bg-background text-primary ring-8 ring-background">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0 rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
                        <p className="font-mono text-[10px] tracking-[0.16em] text-primary">
                          {step.number}
                        </p>
                        <h3 className="mt-3 font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                          {step.title}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-20 border-t border-white/8 px-6 py-24 md:px-10 md:py-32"
        >
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              {pricing.eyebrow}
            </p>
            <h2 className="font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {pricing.heading}
            </h2>
            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-dashed border-white/15 bg-white/1.5`tailwindcss(suggestCanonicalClasses) px-6 py-10 sm:px-10 sm:py-12">
              <span className="inline-flex rounded-full border border-primary/25 bg-primary/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                {pricing.placeholder}
              </span>
              <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {pricing.description}
              </p>
              <Button asChild size="lg" className="mt-7 h-11 rounded-xl px-5">
                <Link href={pricing.action.href}>
                  {pricing.action.label}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="topo-bg relative overflow-hidden px-6 py-20 md:px-10 md:py-28">
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-8 text-center md:flex-row md:justify-between md:gap-14 md:text-left">
            <div className="max-w-2xl">
              <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                {closingCta.eyebrow}
              </p>
              <h2 className="text-balance font-heading text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl md:text-6xl">
                {closingCta.heading}
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {closingCta.description}
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 h-12 gap-2 rounded-xl px-6"
              >
                <Link href={closingCta.action.href}>
                  {closingCta.action.label}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="relative w-48 shrink-0 sm:w-56 md:w-64 lg:w-72">
              <div
                aria-hidden="true"
                className="absolute inset-8 rounded-full bg-primary/20 blur-3xl"
              />
              <Image
                src="/brand/mascot-dark.png"
                alt={closingCta.mascotAlt}
                width={400}
                height={400}
                className="relative h-auto w-full drop-shadow-[0_16px_36px_oklch(0.74_0.16_55/0.18)]"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-center text-sm text-muted-foreground">
          <p className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center">
            {footer.madeWith}
            <Heart
              aria-hidden="true"
              className="size-3.5 fill-primary text-primary"
            />
            {footer.by}
            <Link
              target="_blank"
              href={footer.url}
              className="text-foreground/80 underline decoration-white/20 underline-offset-4 transition-colors hover:text-primary"
            >
              {footer.name}
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
