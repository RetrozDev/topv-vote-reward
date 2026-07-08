# Contributing to TopV Votes Reward

Thank you for your interest in contributing to TopV Votes Reward! This document provides guidelines and branch structure for contributors.

## Branch Structure

```
main                 # Production branch
├── develop          # Main development branch
│   ├── feature/*    # New features
│   ├── fix/*        # Bug fixes
│   ├── docs/*       # Documentation updates
│   ├── refactor/*   # Code refactoring
│   └── perf/*       # Performance improvements
└── release/*        # Release preparation
```

### Branch Naming Convention

- `feature/total-votes-tracking`
- `fix/signature-validation`
- `docs/api-documentation`
- `refactor/webhook-handler`
- `perf/db-query-optimization`
- `release/v2.0.0`

## Development Workflow

1. Fork and clone the repository
```bash
git clone git@github.com:yourusername/topv-votes-reward.git
```

2. Create a new branch from develop
```bash
git checkout develop
git checkout -b feature/your-feature
```

3. Make your changes following our guidelines

4. Commit your changes using conventional commits
```bash
feat: add total_votes column and migration
fix: handle missing discordId in webhook
docs: update README with exports
refactor: extract DB query helpers
perf: reduce duplicate DB calls
```

5. Push your branch and create a Pull Request

## Pull Request Guidelines

- Keep changes focused and atomic — one feature per PR.
- Test your changes on a local FiveM server before submitting.
- Update `config.json` and `locales/` if you add new options or locale keys.
- Use [Conventional Commits](https://www.conventionalcommits.org/).

## Reporting Issues

- Use a clear title and description.
- Include server logs and resource version if reporting a bug.
- Mention your FiveM build, oxmysql version, and framework (ESX, QBCore, etc.).

## Code Style

- Use `camelCase` for variables and functions.
- Use 4-space indentation.
- Use `async/await` over raw promises.
- Prefer early returns to nested conditionals.
