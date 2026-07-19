---
title: One Request, End to End
unit: Unit 1
related:
  - 0002-the-triage-ladder
  - reference/glossary
---

Every incident you will ever debug — timeout, reset, DNS failure, TLS error —
is one of these four stages going wrong. So before any theory, watch a healthy
request happen. Run this in your terminal:

```bash
curl -v https://example.com/
```

Here's that output, trimmed to the lines that matter. Four stages, in order,
every single time:

```text
* Host example.com:443 was resolved.                      ← ① DNS
* IPv4: 93.184.215.14
*   Trying 93.184.215.14:443...                           ← ② TCP
* Connected to example.com (93.184.215.14) port 443
* TLSv1.3 (OUT), TLS handshake, Client hello (1):         ← ③ TLS
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* Server certificate:
*   subject: CN=*.example.com
*   SSL certificate verify ok.
> GET / HTTP/2                                            ← ④ HTTP (request)
> Host: example.com
> User-Agent: curl/8.5.0
> Accept: */*
>
< HTTP/2 200                                              ← ④ HTTP (response)
< content-type: text/html; charset=UTF-8
```

## The four stages

1. **DNS** — turn the name `example.com` into an IP address. Until this
   succeeds, nothing else can even start.
2. **TCP** — open a connection to that IP on port 443. "Trying…" then
   "Connected" means a machine answered on that port.
3. **TLS** — negotiate encryption and check the server's certificate. "SSL
   certificate verify ok" is the healthy sign.
4. **HTTP** — finally, the actual conversation: a request goes out, a
   response comes back with a status code.

## Reading the margins

The first character of each line tells you who's talking
([everything curl — Verbose](https://everything.curl.dev/usingcurl/verbose/index.html)):

:::jargon
`*` :: curl narrating its own plumbing — DNS, TCP, TLS progress.
`>` :: bytes curl **sends** to the server (the HTTP request).
`<` :: bytes the server **sends back** (the HTTP response).
:::

:::note{title="Why stages beat layers"}
Textbooks teach seven OSI layers. On call, you need four stages — because each
stage fails with a *different error*, and naming the stage is 80% of the
diagnosis. That's the whole course in one sentence.
:::

:::quiz
`*   Trying 93.184.215.14:443...` — which stage is this line?

- [ ] DNS lookup
- [x] TCP connect
- [ ] TLS setup
:::

:::quiz
`curl: (6) Could not resolve host: exmaple.com` — which stage failed?

- [x] DNS lookup
- [ ] TCP connect
- [ ] TLS setup
:::

:::quiz
Lines starting with `>` show…

- [ ] the response headers
- [x] the request being sent
- [ ] the TLS certificate details
:::

:::win
You can now take any `curl -v` output — or any error message — and name which
of the four stages it belongs to. That single skill is the skeleton every
other unit hangs off.
:::

Run `curl -v` against a site you use daily and find the four stage boundaries
in the output. Then move on to the ladder these stages imply.

:::source
[everything curl — Verbose](https://everything.curl.dev/usingcurl/verbose/index.html)
by Daniel Stenberg (curl's author). The definitive decoder ring for every line
`curl -v` prints.
:::
