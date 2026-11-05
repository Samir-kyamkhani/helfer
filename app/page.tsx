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
import { listSubscriptionPlans } from "@/lib/payments/service";
import { PricingPlans } from "@/components/billing/PricingPlans";
import { Suspense } from "react";
import { SuspenseFallback } from "@/components/SuspenseFallback";

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

/* Shared shell for every product preview: white window, hairline border,
   soft elevation. Keeping it in one constant keeps the three mocks identical. */
const mockShell =
  "overflow-hidden rounded-2xl border border-border bg-card shadow-lg";

function PreviewHeader({
  workspace,
  status,
}: {
  workspace: string;
  status: string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-border bg-surface px-3 sm:px-4">
      <div aria-hidden="true" className="flex gap-1.5">
        <span className="size-2 rounded-full bg-border-strong" />
        <span className="size-2 rounded-full bg-border-strong" />
        <span className="size-2 rounded-full bg-border-strong" />
      </div>
      <span className="truncate font-mono text-[9px] tracking-[0.12em] text-muted-foreground sm:text-[10px]">
        {workspace}
      </span>
      <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 font-mono text-[8px] text-muted-foreground shadow-xs sm:text-[9px]">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
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
    <div aria-hidden="true" className={mockShell}>
      <PreviewHeader workspace={preview.workspace} status={preview.status} />
      <div className="relative aspect-[1.65] min-h-64 overflow-hidden bg-surface">
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
              <circle cx="1" cy="1" r="1" fill="#c6cad2" fillOpacity="0.7" />
            </pattern>
          </defs>
          <rect width="600" height="300" fill="url(#canvas-grid)" />
          <path
            d="M192 150 H210 M390 150 H418 V88 H408 M390 150 H418 V214 H408"
            fill="none"
            stroke="#a1a6b0"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>

        {preview.nodes.map((node, index) => (
          <div
            key={node.label}
            className={`absolute z-10 flex min-h-11 w-[30%] items-center gap-1.5 rounded-lg border px-2 py-2 text-[9px] font-medium leading-tight text-foreground shadow-sm sm:gap-2 sm:px-3 sm:text-[10px] ${nodePositions[index]} ${
              node.kind === "decision"
                ? "border-brand/50 bg-brand-soft"
                : "border-border bg-card"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-sm ${
                node.kind === "decision"
                  ? "rotate-45 bg-brand"
                  : "bg-border-strong"
              }`}
            />
            <span className="min-w-0">{node.label}</span>
          </div>
        ))}

        <span className="absolute left-[57%] top-[25%] z-20 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground shadow-xs">
          {preview.branches.yes}
        </span>
        <span className="absolute left-[57%] top-[69%] z-20 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground shadow-xs">
          {preview.branches.no}
        </span>
      </div>
      <div className="border-t border-border bg-card px-3 py-2 font-mono text-[9px] text-muted-foreground sm:px-4">
        {preview.footer}
      </div>
    </div>
  );
}

function DocsMock({ preview }: { preview: DocsPreview }) {
  return (
    <div aria-hidden="true" className={mockShell}>
      <PreviewHeader workspace={preview.workspace} status={preview.status} />
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-2 text-muted-foreground">
            <FileText aria-hidden="true" className="size-4" />
            <span className="font-mono text-[9px] tracking-[0.12em]">
              {preview.workspace}
            </span>
          </div>
          <h3 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {preview.title}
          </h3>
          <p className="mt-3 max-w-md text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
            {preview.intro}
          </p>
          <div className="mt-6 rounded-r-lg border-l-2 border-brand bg-surface px-4 py-3 sm:mt-7 sm:px-5 sm:py-4">
            <h4 className="text-xs font-semibold text-foreground sm:text-sm">
              {preview.sectionTitle}
            </h4>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground sm:text-xs sm:leading-6">
              {preview.sectionText}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 shadow-xs sm:mt-6 sm:px-4">
            <span className="rounded-md bg-brand-soft px-2 py-1 font-mono text-[9px] text-brand-strong">
              {preview.summaryLabel}
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-[11px]">
              {preview.summary}
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="ml-auto size-3.5 text-muted-foreground/60"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamBoardMock({ preview }: { preview: TeamBoardPreview }) {
  return (
    <div aria-hidden="true" className={`relative ${mockShell}`}>
      <PreviewHeader workspace={preview.workspace} status={preview.status} />
      <div className="relative grid min-h-64 grid-cols-3 gap-2 bg-surface p-3 sm:gap-3 sm:p-4">
        {preview.columns.map((column) => (
          <div
            key={column.title}
            className="min-w-0 rounded-xl border border-border bg-secondary/60 p-2 sm:p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-1 sm:mb-3">
              <span className="truncate text-[9px] font-medium text-foreground sm:text-[11px]">
                {column.title}
              </span>
              <span className="font-mono text-[8px] text-muted-foreground sm:text-[9px]">
                {column.count}
              </span>
            </div>
            <div className="space-y-2">
              {column.cards.map((card) => (
                <div
                  key={card}
                  className="min-h-14 rounded-lg border border-border bg-card p-2 shadow-xs sm:min-h-16 sm:p-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="mb-2 block h-1 w-6 rounded-full bg-brand sm:w-8"
                  />
                  <span className="block truncate text-[8px] leading-4 text-foreground/75 sm:text-[10px]">
                    {card}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="absolute left-[43%] top-[47%] flex items-center gap-1 text-info drop-shadow-sm">
          <MousePointer2 aria-hidden="true" className="size-4 fill-info" />
          <span className="rounded-full bg-info px-2 py-1 text-[8px] font-medium text-white">
            {preview.cursorLabels[0]}
          </span>
        </div>
        <div className="absolute bottom-[12%] right-[13%] flex items-center gap-1 text-brand drop-shadow-sm">
          <MousePointer2 aria-hidden="true" className="size-4 fill-brand" />
          <span className="rounded-full bg-brand px-2 py-1 text-[8px] font-medium text-white">
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

async function PricingSection() {
  const plans = await listSubscriptionPlans();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <p className="eyebrow">Plans</p>

        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Choose the workspace that fits
        </h2>

        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Compare usage, collaboration, and export features. You can change a
          paid plan from billing settings.
        </p>
      </header>

      <PricingPlans plans={plans} />

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        Plan prices and provider products are managed in the billing catalog.
        Paid checkout appears after the provider keys and product IDs are
        configured.
      </p>
    </div>
  );
}

export default function Home() {
  const { hero, audience, features, howItWorks, closingCta, footer } =
    landingCopy;

  return (
    <>
      <main>
        {/* Hero */}
        <section className="topo-bg relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-6 py-24 md:px-10">
          <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
            <p className="eyebrow mb-8 inline-flex items-center gap-2.5 rounded-full border border-border bg-card/80 px-3.5 py-1.5 shadow-xs backdrop-blur-sm sm:mb-10">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-brand"
              />
              {hero.eyebrow}
            </p>

            <h1 className="max-w-4xl text-balance font-heading text-5xl font-semibold leading-[1] tracking-[-0.055em] text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              {hero.headline.before}{" "}
              <span className="text-brand-strong">{hero.headline.highlight}</span>{" "}
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
                className="h-12 gap-2 rounded-xl px-6 text-sm shadow-md sm:text-[0.95rem]"
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
                className="h-12 rounded-xl border-border-strong bg-card px-6 text-sm shadow-xs hover:bg-accent sm:text-[0.95rem]"
              >
                <Link href={hero.secondaryAction.href}>
                  {hero.secondaryAction.label}
                </Link>
              </Button>
            </div>

            <div className="survey-frame scroll-tilt mt-20 w-full max-w-5xl">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
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

        {/* Audience strip */}
        <section
          aria-label={audience.label}
          className="border-y border-border bg-surface px-6 py-6 md:px-10"
        >
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <p className="eyebrow shrink-0 text-muted-foreground!">
              {audience.label}
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:gap-x-7">
              {audience.groups.map((group) => (
                <li
                  key={group}
                  className="inline-flex items-center gap-2 text-sm text-foreground/80"
                >
                  <span
                    aria-hidden="true"
                    className="size-1 rounded-full bg-brand"
                  />
                  {group}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section
          id="product"
          className="scroll-mt-20 px-6 pb-28 pt-24 md:px-10 md:pb-36 md:pt-32"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-14 max-w-3xl text-center sm:mb-20">
              <p className="eyebrow mb-4">{features.eyebrow}</p>
              <h2 className="text-balance font-heading text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl md:text-6xl">
                {features.heading}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {features.subtitle}
              </p>
            </div>

            <div className="divide-y divide-border border-y border-border">
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
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-card text-brand-strong shadow-sm">
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
                            <span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
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

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-t border-border bg-surface px-6 py-24 md:px-10 md:py-32"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-14 max-w-3xl text-center sm:mb-20">
              <p className="eyebrow mb-4">{howItWorks.eyebrow}</p>
              <h2 className="text-balance font-heading text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl md:text-6xl">
                {howItWorks.heading}
              </h2>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute bottom-6 left-6 top-6 border-l border-dashed border-border-strong lg:bottom-auto lg:left-[16%] lg:right-[16%] lg:top-6 lg:border-l-0 lg:border-t"
              />
              <ol className="relative grid gap-8 lg:grid-cols-3 lg:gap-8">
                {howItWorks.steps.map((step) => {
                  const Icon = stepIcons[step.id];

                  return (
                    <li
                      key={step.id}
                      className="relative flex gap-5 lg:flex-col lg:items-center lg:gap-6 lg:text-center"
                    >
                      <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full border border-border-strong bg-card text-brand-strong shadow-sm ring-8 ring-surface">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                        <p className="font-mono text-[10px] tracking-[0.16em] text-brand-strong">
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

        {/* Pricing */}
        <section
          id="pricing"
          className="scroll-mt-20 border-t border-border px-6 py-24 md:px-10 md:py-32"
        >
          <Suspense fallback={<SuspenseFallback />}>
            <PricingSection />
          </Suspense>
        </section>

        {/* Closing CTA */}
        <section className="topo-bg relative overflow-hidden border-t border-border px-6 py-20 md:px-10 md:py-28">
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-8 text-center md:flex-row md:justify-between md:gap-14 md:text-left">
            <div className="max-w-2xl">
              <p className="eyebrow mb-4">{closingCta.eyebrow}</p>
              <h2 className="text-balance font-heading text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl md:text-6xl">
                {closingCta.heading}
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {closingCta.description}
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 h-12 gap-2 rounded-xl px-6 shadow-md"
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
                className="absolute inset-6 rounded-full bg-brand-soft blur-2xl"
              />
              <Image
                src="/brand/mascot-dark.png"
                alt={closingCta.mascotAlt}
                width={400}
                height={400}
                className="relative h-auto w-full drop-shadow-[0_12px_24px_oklch(0.25_0.01_265/0.12)]"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-center text-sm text-muted-foreground">
          <p className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center">
            {footer.madeWith}
            <Heart
              aria-hidden="true"
              className="size-3.5 fill-brand text-brand"
            />
            {footer.by}
            <Link
              target="_blank"
              href={footer.url}
              className="text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-brand-strong"
            >
              {footer.name}
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}