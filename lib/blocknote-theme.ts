// BlockNote ships its own palette, not ours. Override it with the app's tokens from globals.css
// (Snow White). Values are CSS variable references, so the doc panel follows the design system
// automatically and there is no second set of colours to keep in sync.
export const helferLightTheme = {
  colors: {
    editor: { text: "var(--foreground)", background: "var(--background)" },
    menu: { text: "var(--popover-foreground)", background: "var(--popover)" },
    tooltip: {
      text: "var(--popover-foreground)",
      background: "var(--popover)",
    },
    hovered: { text: "var(--accent-foreground)", background: "var(--accent)" },
    selected: { text: "var(--foreground)", background: "var(--border)" },
    disabled: { text: "var(--muted-foreground)", background: "var(--muted)" },
    shadow: "oklch(0.25 0.01 265 / 12%)",
    border: "var(--border)",
    sideMenu: "var(--muted-foreground)",
    highlights: {},
  },
  borderRadius: 8,
  fontFamily: "var(--font-geist-sans)",
};
