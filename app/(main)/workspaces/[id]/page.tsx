import { redirect } from "next/navigation";

export default async function LegacyWorkspacePage({
  params,
  searchParams,
}: PageProps<"/workspaces/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, item));
    } else if (value !== undefined) {
      search.set(key, value);
    }
  }

  const queryString = search.toString();
  redirect(
    `/workspace/${encodeURIComponent(id)}${queryString ? `?${queryString}` : ""}`,
  );
}
