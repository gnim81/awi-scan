# Releasing

1. Confirm `gh api user --jq .login` is `gnim81`.
2. Run `npm run check`.
3. Run `npm audit`.
4. Run `npm pack --dry-run` and confirm `docs/superpowers/**` is not included.
5. Run `node dist/cli.js examples --format human --fail-on none`.
6. Confirm `dist/cli.js` and `dist/action.js` exist.
7. Update `CHANGELOG.md` when it exists.
8. Tag the release.
9. Create a GitHub release with the README example and the main AWI threat model.
10. Publish to npm only when `npm whoami` succeeds.

Current release target: `v0.1.1`.
