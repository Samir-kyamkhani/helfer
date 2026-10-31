export { cn } from "cn";

// Enter sends, Shift + Enter adds a new line.
export function submitOnEnter(submit: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    submit();
  };
}
