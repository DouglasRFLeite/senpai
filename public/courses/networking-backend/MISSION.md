# Mission: Networking for a Backend Engineer & Application Support

## Why
Debug production incidents confidently today — timeouts, connection resets, DNS
failures, TLS errors, latency spikes — and make sound service/infrastructure
design decisions as I grow into architecture work. A solid enough base to hold
my own in networking interview questions is a welcome side effect. Practical,
tool-in-hand knowledge over protocol academia.

## Success looks like
- Given "service A can't reach service B", methodically isolate the failure —
  DNS, routing, firewall, TLS, or app layer — reaching for the right tool at
  each step (curl, dig, tcpdump, ss/netstat).
- Capture and read real traffic: interpret tcpdump/Wireshark output, follow an
  HTTP exchange and a TLS handshake on the wire.
- Deep working command of HTTP: methods, status codes, headers, caching,
  keep-alive, HTTP/2/3, proxies, CORS, timeouts/retries.
- Talk fluently with infra/network teams: subnets, NAT, load balancers, VPNs,
  cloud constructs (VPCs, security groups).
- Answer common backend-interview networking questions without hand-waving.

## Constraints
- ~30 min/day, steady — short lessons plus drilling in the app; the course can
  span many units.
- Go only as deep into layers/protocols as debugging and design require; no
  layer-by-layer OSI academia for its own sake.

## Out of scope
- Nothing hard-excluded — the curriculum deliberation decides scope, honoring
  the depth constraint above.
