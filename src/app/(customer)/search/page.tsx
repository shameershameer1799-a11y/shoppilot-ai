import { redirect } from "next/navigation";

/** /search is a thin alias — the Shop page's search box is the canonical search UI. */
export default function SearchRedirectPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q ? `?search=${encodeURIComponent(searchParams.q)}` : "";
  redirect(`/shop${q}`);
}
