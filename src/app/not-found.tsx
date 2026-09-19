import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link href="/" className="mt-6 inline-block underline">
        Back to neighborhood issues
      </Link>
    </main>
  );
}
