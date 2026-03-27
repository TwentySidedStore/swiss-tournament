export default function App() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-body">
      <header className="border-b border-gold-dim px-4 py-3">
        <h1 className="font-display text-2xl text-gold-primary tracking-wide">
          Twenty Sided Swiss
        </h1>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-text-secondary">App shell ready.</p>
      </main>
      <footer className="text-center text-text-muted text-sm py-4">
        Twenty Sided Store ·{' '}
        <a
          href="https://github.com/TwentySidedStore/swiss-tournament"
          className="underline hover:text-text-secondary"
          target="_blank"
          rel="noopener noreferrer"
        >
          View source on GitHub
        </a>
      </footer>
    </div>
  )
}
