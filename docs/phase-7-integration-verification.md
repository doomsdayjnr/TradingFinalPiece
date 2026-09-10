# Phase 7 Integration Verification

Date: 2026-09-10. Branch: `phase-7-ea-runtime-integration`.

## Completed Checks

| Check | Result |
| --- | --- |
| Private MT4 EA integration, version 1.02 | Compiled: 0 errors, 0 warnings |
| Private MT5 EA integration, version 1.02 | Compiled: 0 errors, 0 warnings, X64 Regular |
| Original strategy/manual-close preservation | Passed normalized source comparison, excluding licensing insertions and version metadata |
| Standalone helper self-test scripts | Both compiled: 0 errors, 0 warnings; not executed |
| `npm run test:license` | 26 tests passed using database doubles against the real route |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Production hostname/API reachability | Blocked: curl could not resolve `www.tradingfinalpiece.com` from this environment |
| Connected-terminal validation and order behavior | Not run; requires working HTTPS deployment and isolated terminal fixtures |
| Supabase binary replacement | Not performed; endpoint and terminal checks must precede distribution |

No real-money trades were placed and no user trading terminal was launched.
The JavaScript regression tests do not validate Supabase RLS or actual database
constraints; the MQL compilation does not prove runtime behavior.

## Private Build Hashes

SHA-256 of the compiled strategy binaries (not the self-test scripts):

| Binary | SHA-256 |
| --- | --- |
| `MT4/tfp_edge.ex4` | `6A396F415CF1388D143CCB2A73EBC3EA50B7C8630A2F64696079D14DCBAB0DEE` |
| `MT5/tfp_edge.ex5` | `056E9DECD7B2B8360BAF18064596873EFD91AE7CB4D5124837351680B0306341` |

Source, binary and compilation logs remain under the private folder provided by
the owner. Original source backups are in `originals-before-licensing` there.
Recompiling can change binary hashes; record new hashes before distribution.

## Outstanding Requirements

Connect the hostname to the updated website, run connected-terminal tests,
then replace/download-verify the Supabase binaries. Follow
[the deployment order](phase-7-ea-integration.md) and keep the full acceptance
results in [Testing Results](testing-results.md).

Offline grants currently survive only within an EA session. Restart grace is
not implemented; this is a recorded requirement deviation, not a completed test.
Likewise, grace activation is logged in the terminal but not centrally reported
while offline. The original analytics tracking gaps remain for full testing.
