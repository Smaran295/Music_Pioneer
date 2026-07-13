export default function Footer() {
  return (
    <footer className="border-t border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row">
        <p className="order-2 md:order-1">&copy; {new Date().getFullYear()} Music Pioneer</p>
        <nav className="order-1 flex items-center gap-6 md:order-2">
          <a
            href="https://github.com/Smaran295"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline"
            aria-label="Contact via GitHub"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  )
}
