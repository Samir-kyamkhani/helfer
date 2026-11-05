export const landingCopy = {
  hero: {
    eyebrow: "Early access",
    headline: {
      before: "An",
      highlight: "agent",
      after: "that draws and writes",
      finalLine: "in your workspace",
    },
    subtitle:
      "Describe what you need. Helfer builds it on a canvas, in a doc, or both, and keeps the two consistent.",
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
    eyebrow: "Two surfaces, one agent",
    heading: "A canvas and a doc that stay in sync",
    subtitle:
      "Helfer works directly on your workspace. It picks the right surface for the job, or you tell it where to work.",
    rows: [
      {
        id: "canvas",
        layout: "copy-first",
        title: "Canvas",
        description:
          "An infinite whiteboard where the agent places each shape one at a time, with room between boxes so diagrams stay readable. Ask for a change and it edits the diagram in place.",
        bullets: [
          "Flowcharts, architecture diagrams and anything visual",
          "Entity-relationship diagrams with real tables, columns and relationships",
          "Evenly spaced layouts with no overlapping shapes",
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
          "A rich-text editor where the agent writes specs, notes, explanations and plans. It edits the blocks you point at and leaves the rest of the document alone.",
        bullets: [
          "Headings, lists, checklists, tables, code blocks and links",
          "Add, rewrite or remove a single block without touching the rest",
          "Turn a diagram into a written spec, or draw what a doc describes",
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
    eyebrow: "From request to finished work",
    heading: "How it works",
    steps: [
      {
        number: "01",
        id: "describe",
        title: "Ask in plain words",
        description:
          "Say what you need, like a checkout flow, a database schema or a project plan. Name a surface to limit the change to just the canvas or just the doc.",
      },
      {
        number: "02",
        id: "draw",
        title: "Helfer picks the surface",
        description:
          "Visual work goes on the canvas and written work goes in the doc. When a request needs both, such as a schema and its documentation, it builds both.",
      },
      {
        number: "03",
        id: "iterate",
        title: "Refine in place",
        description:
          "Ask for a change and the agent edits what is already there. Turn a diagram into a spec or a doc into a diagram whenever you like.",
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
    heading: "Say what you need. Watch it get built.",
    description:
      "Open a workspace and let Helfer draw the diagram, write the doc, or do both.",
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
