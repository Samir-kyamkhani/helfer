export const landingCopy = {
  hero: {
    eyebrow: "Early access",
    headline: {
      before: "An",
      highlight: "helfer",
      after: "for whatever",
      finalLine: "you’re building",
    },
    subtitle:
      "A workspace where your team and an AI teammate can think, write, and build together.",
    primaryAction: { label: "Start building free", href: "/sign-up" },
    secondaryAction: { label: "See how it works", href: "#how-it-works" },
    videoAlt: "Preview of the Helfer workspace",
    videoFallback: "Your browser does not support the video tag.",
  },
  audience: {
    label: "Made for people who make things",
    groups: [
      "Product teams",
      "Founders",
      "Solo builders",
      "Agencies",
      "Consultants",
    ],
  },
  features: {
    eyebrow: "One connected way to work",
    heading: "One agent, one workspace, your whole team",
    subtitle:
      "Move from the first sketch to a shared plan and keep the whole team in sync.",
    rows: [
      {
        id: "canvas",
        layout: "copy-first",
        title: "Canvas",
        description:
          "An infinite whiteboard where the agent draws flowcharts, ERDs, architecture diagrams, and org charts shape by shape, then edits them in place when you ask.",
        bullets: [
          "Explore flowcharts, ERDs, architecture diagrams, and org charts",
          "Watch each shape appear as the agent works",
          "Ask for a change and see the diagram update in place",
        ],
        mock: {
          kind: "canvas",
          workspace: "CHECKOUT / FLOW",
          status: "Helfer is editing",
          footer: "4 shapes · updated just now",
          branches: { yes: "Yes", no: "No" },
          nodes: [
            { label: "New order", kind: "start" },
            { label: "In stock?", kind: "decision" },
            { label: "Reserve item", kind: "process" },
            { label: "Request restock", kind: "process" },
          ],
        },
      },
      {
        id: "docs",
        layout: "mock-first",
        title: "Docs",
        description:
          "A block editor where the agent turns a diagram into a written spec, then rewrites or summarizes sections on command.",
        bullets: [
          "Turn a diagram into a clear written spec",
          "Rewrite a section without changing the rest",
          "Summarize long docs in a moment",
        ],
        mock: {
          kind: "docs",
          workspace: "CHECKOUT / SPEC",
          status: "Drafted from canvas",
          title: "Checkout flow",
          intro:
            "A reliable path from cart to confirmation, with clear recovery when a payment fails.",
          sectionTitle: "Payment handling",
          sectionText:
            "After validating the cart, the service authorizes payment before creating the order.",
          summaryLabel: "Ask Helfer",
          summary: "Summarize this section",
        },
      },
      {
        id: "team-board",
        layout: "copy-first",
        title: "Team board",
        description:
          "A kanban board of every workspace in your org, with live cursors so teammates can jump in together.",
        bullets: [
          "See every workspace together in one board",
          "Move projects through a shared kanban flow",
          "Join teammates on the board with live cursors",
        ],
        mock: {
          kind: "team-board",
          workspace: "ACME STUDIO / WORKSPACES",
          status: "4 teammates online",
          columns: [
            {
              title: "Up next",
              count: "02",
              cards: ["Mobile app", "Research sprint"],
            },
            {
              title: "In progress",
              count: "03",
              cards: ["Checkout refresh", "Design system"],
            },
            {
              title: "Ready",
              count: "01",
              cards: ["Q4 roadmap"],
            },
          ],
          cursorLabels: ["Maya", "Dev"],
        },
      },
    ],
  },
  howItWorks: {
    eyebrow: "A clear path from idea to action",
    heading: "How it works",
    steps: [
      {
        number: "01",
        id: "describe",
        title: "Describe it",
        description:
          "Tell Helfer what you’re exploring, planning, or trying to solve.",
      },
      {
        number: "02",
        id: "draw",
        title: "Watch the agent draw",
        description:
          "See your idea take shape on the canvas, one considered shape at a time.",
      },
      {
        number: "03",
        id: "iterate",
        title: "Keep iterating together",
        description:
          "Ask for changes, turn the result into docs, and bring your team into the same workspace.",
      },
    ],
  },
  pricing: {
    eyebrow: "Pricing",
    heading: "Plans are taking shape.",
    placeholder: "Pricing details are coming soon.",
    description:
      "We’re putting together plans that work for solo builders and growing teams alike.",
    action: { label: "Start building free", href: "/sign-up" },
  },
  closingCta: {
    eyebrow: "Your next idea starts here",
    heading: "Make room for what you’re building.",
    description:
      "Bring your ideas, your team, and your agent into one shared workspace.",
    action: { label: "Start building free", href: "/sign-up" },
    mascotAlt: "Helfer mascot",
  },
  footer: {
    madeWith: "Made with",
    by: "by",
    name: "Samir Khan",
    url: "https://heyitssamir.vercel.app",
  },
} as const;
