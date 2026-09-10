# EA License Validation API

Endpoint:

```text
POST /api/v1/license/validate
```

Request body:

```json
{
  "account_number": "12345678",
  "account_type": "live",
  "platform_type": "MT5",
  "broker_name": "XM",
  "ea_product": "tfp-edge",
  "ea_version": "1.0.0",
  "license_token": "user-license-token"
}
```

Successful response:

```json
{
  "allowed": true,
  "status": "active",
  "message": "License active",
  "grace_until": "2026-09-12T12:00:00.000Z",
  "expires_at": null,
  "server_time": "2026-09-10T12:00:00.000Z"
}
```

Denied response:

```json
{
  "allowed": false,
  "status": "pending",
  "message": "Account #12345678 is pending."
}
```

Rules:

- Live access requires a verified live broker account and matching active live entitlement.
- Demo access requires a matching active demo entitlement that has not expired.
- The EA must send `MT4` or `MT5` as `platform_type`.
- `account_type` may be `live`, `real`, or `demo`.
- `license_token` is hashed before validation lookup.
- Tokens must be the issued 64-character hexadecimal string; account numbers are digit strings, never JSON numbers.
- The product must be `tfp-edge` and match the entitlement.
- MVP note: raw tokens are shown in the user portal so traders can paste them into the EA inputs.
- Parsed validation decisions are submitted to `license_checks`. Malformed JSON/non-object bodies and missing server configuration return before database logging; database outages can also prevent log persistence.
- Allowed responses include `server_time`, `expires_at`, and `grace_until` at most 48 hours ahead, capped by expiry. For demo licenses, both trial and entitlement expiries constrain access; the earlier expiry is returned.
- Live entitlements with an elapsed expiry are denied even when status is active.
- Removed historical accounts are excluded from live lookup; account/platform matching occurs before selecting a current row. A wrong platform may return `not_found`.
- Database lookup errors produce a server-error response rather than a false account-not-found decision.
- Basic in-memory rate limiting applies per IP/account for launch protection.

The endpoint trusts runtime account information supplied by the compiled client;
it is not independent broker attestation. The distributed EA pins the URL and
detects actual demo/live mode. See [integration notes](phase-7-ea-integration.md)
for the in-memory grace and restart limitation.
