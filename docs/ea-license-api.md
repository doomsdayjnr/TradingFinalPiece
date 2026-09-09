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
  "grace_until": "2026-08-30T12:00:00.000Z"
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
- `license_token` is hashed before lookup. Raw tokens are never stored.
- Every validation attempt is written to `license_checks`.
- Allowed responses include a 48-hour `grace_until` value for EA-side API outage handling.
- Basic in-memory rate limiting applies per IP/account for launch protection.
