# Twenty Sided Swiss

Swiss tournament pairing and scoring for Magic: The Gathering. Built for [Twenty Sided Store](https://twentysidedgames.com).

**Live:** https://twentysidedstore.github.io/swiss-tournament/

## Setup

```bash
git clone https://github.com/TwentySidedStore/swiss-tournament.git
cd swiss-tournament
npm install
npm run dev
```

## Development

```bash
npm run dev          # Dev server (http://localhost:5173)
npm test             # Run tests
npm test -- --watch  # Tests in watch mode
```

## Build

```bash
npm run build     # Production build → dist/
npm run preview   # Preview build locally
```

## Deploy

### GitHub Pages (primary)

Automatic. Push to `main` → GitHub Actions builds, tests, and deploys.

`.github/workflows/deploy.yml` runs:
1. `npm ci`
2. `npm test`
3. `npm run build`
4. Deploy `dist/` to GitHub Pages

### Nginx (alternative)

```bash
npm run build
scp -r dist/* user@server:/var/www/swiss-tournament/
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/swiss-tournament;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Tech Stack

- React + Vite
- Tailwind CSS
- Vitest + React Testing Library
- GitHub Actions CI/CD

## License

MIT
