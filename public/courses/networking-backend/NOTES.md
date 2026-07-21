# Notes — networking-backend

User decisions (2026-07-19, answering CURRICULUM.md's open questions):

- **Practice environment:** yes — has a Linux terminal (the Senpai dev
  container works) for run-it-yourself exercises (`curl`, `dig`, `ss`,
  `tcpdump`, `openssl s_client`, `python3 -m http.server`).
- **Cloud flavor (Unit 12):** AWS terminology as default, with brief GCP/Azure
  mapping notes.
- **Course content language:** English (lessons, references, banks).
- **Scope:** 14-unit arc accepted as designed; use the curriculum's cut order
  only if schedule pressure appears.

Teaching preferences observed:

- Backend engineer with daily tool exposure — don't over-explain what curl or
  a status code is; do explain what the output *proves*.
- Explicitly asked not to go too deep on layers/protocols — enforce the
  curriculum's depth caps in every lesson.

Environment (2026-07-21, from Unit 2 feedback — see learning-record 0002):

- The dev container was missing `dig`/`ss`/`tcpdump`/`nc`, which broke Unit 2's
  run-it-yourself steps ("tools did not work as expected"). `Dockerfile.dev` now
  installs `dnsutils iproute2 tcpdump netcat-openbsd`; **needs a rebuild**
  (`docker compose build dev`) to take effect.
- Every tool-first lesson must carry: an install line, the **expected output**,
  and a no-install fallback (e.g. `getent hosts`). Non-negotiable from here.
