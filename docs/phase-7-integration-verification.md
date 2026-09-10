# Phase 7 Integration Verification

Date: 2026-09-10. Branch: `phase-7-ea-runtime-integration`.

## Completed Checks

| Check | Result |
| --- | --- |
| Private MT4 EA integration, version 1.03 | Recompiled with Vercel URL: 0 errors, 0 warnings |
| Private MT5 EA integration, version 1.03 | Recompiled with Vercel URL: 0 errors, 0 warnings, X64 Regular |
| Original strategy/manual-close preservation | Passed normalized source comparison, excluding licensing insertions and version metadata |
| Standalone helper self-test scripts | Both compiled: 0 errors, 0 warnings; not executed |
| `npm run test:license` | 26 tests passed using database doubles against the real route |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Test hostname/API reachability | Vercel site reachable, but `/api/health` and `POST /api/v1/license/validate` both returned HTTP 404 |
| Connected-terminal validation and order behavior | Not run; requires working HTTPS deployment and isolated terminal fixtures |
| Supabase binary replacement | Not performed; endpoint and terminal checks must precede distribution |

No real-money trades were placed and no user trading terminal was launched.
The JavaScript regression tests do not validate Supabase RLS or actual database
constraints; the MQL compilation does not prove runtime behavior.

## Private Build Hashes

SHA-256 of the compiled strategy binaries (not the self-test scripts):

| Binary | SHA-256 |
| --- | --- |
| `MT4/tfp_edge.ex4` | `B866B1D111405346A55651BFFA7122424DE9FFBC168CD2E57D62F4160603D41E` |
| `MT5/tfp_edge.ex5` | `DF1EC54F749E028307E217216265DF8A3003A4A7752CFAC576288A6DA6C215FF` |

Source, binary and compilation logs remain under the private folder provided by
the owner. Original source backups are in `originals-before-licensing` there.
Recompiling can change binary hashes; record new hashes before distribution.

## Outstanding Requirements

Deploy this integration branch at `https://trading-final-piece.vercel.app`, run connected-terminal tests,
then replace/download-verify the Supabase binaries. Follow
[the deployment order](phase-7-ea-integration.md) and keep the full acceptance
results in [Testing Results](testing-results.md).

Offline grants currently survive only within an EA session. Restart grace is
not implemented; this is a recorded requirement deviation, not a completed test.
Likewise, grace activation is logged in the terminal but not centrally reported
while offline. The original analytics tracking gaps remain for full testing.

Version 1.03 changes only the pinned URLs, WebRequest message, and version
metadata from 1.02. The API regression, typecheck and build results above are
from the preceding unchanged website/API code. Both strategy binaries were
recompiled after the URL change; no connected-terminal test has been claimed.
Earlier local binaries were backed up in `builds-before-vercel-url`; the
currently hosted Supabase binaries still need a separate backup before replacement.
