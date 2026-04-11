# Kitchen Feature Module

This folder is the incremental destination for new kitchen feature development.

Scope for new work:

- Feature-level server APIs in `server/`
- Feature-level schemas in `schemas/`
- Feature-level mappers in `mappers/`
- Feature UI composition in `components/`

Migration policy:

- Existing `lib/actions/*` and `lib/queries/*` remain valid and should not be rewritten in bulk.
- New kitchen features should start in this module and can reuse shared logic from `lib/`.
- Opportunistic migration is preferred when touching related files.
