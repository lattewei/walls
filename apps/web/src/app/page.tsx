import Link from "next/link";
import { ArrowRight, MusicNotes, UploadSimple, UserCircle } from "@phosphor-icons/react/dist/ssr";

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div className="space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-400/90">
            Open source music desk
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl md:leading-[1.08]">
            Put your beat on the artist&apos;s wall
          </h1>
          <p className="max-w-md text-base leading-relaxed text-zinc-400">
            Create a page for Johnny, upload your prod, tag it. They open the page,
            listen in the browser, and hit you up.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/artists"
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-400 active:scale-[0.98]"
            >
              Browse artists
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <ol className="space-y-4 text-sm text-zinc-300">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 font-mono text-xs text-amber-400">
                1
              </span>
              <span>
                <strong className="text-zinc-100">Open or create</strong> an artist
                page (community by default).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 font-mono text-xs text-amber-400">
                2
              </span>
              <span>
                <strong className="text-zinc-100">Upload</strong> MP3/WAV and tag
                the artist slug.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 font-mono text-xs text-amber-400">
                3
              </span>
              <span>
                <strong className="text-zinc-100">They listen</strong> and contact
                you via public Instagram or email.
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: MusicNotes,
            title: "Artist walls",
            body: "Every tagged prod lands on one public page.",
            href: "/artists",
          },
          {
            icon: UploadSimple,
            title: "Fast upload",
            body: "Handle auth, multipart audio, stream in-app.",
            href: "/upload",
          },
          {
            icon: UserCircle,
            title: "Public contacts",
            body: "Share Instagram or email only if you want.",
            href: "/me",
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700 hover:bg-zinc-900/60"
          >
            <item.icon className="mb-3 h-6 w-6 text-amber-400" weight="duotone" />
            <h2 className="text-sm font-semibold text-zinc-100">{item.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              {item.body}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
