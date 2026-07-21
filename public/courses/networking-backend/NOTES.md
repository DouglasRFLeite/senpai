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

- Douglas runs run-it-yourself commands on his **host, not the dev container**.
  The Unit 2 awkwardness was *environment mismatch* (lessons hard-coded one
  Linux environment's tools/output), NOT missing tools. My first diagnosis was
  wrong; corrected in learning-record 0002.
- **Lessons must be environment-honest:** no byte-for-byte output promises;
  give per-OS variants (Linux `ss` / macOS `lsof`, install notes per distro);
  teach reading for shape and mechanism. Non-negotiable from here.
- **His actual OS is still unknown** — asked, not yet answered. Assume cross-OS
  (esp. before Units 6/7/9 tooling: `tcpdump`, `openssl s_client`).
- **Don't push the Question Bank as "the answer."** His goal is practical
  debugging; lead with run-it-yourself on real systems, the design-review
  thread, the capstone, and communities. The Bank is offered, not pushed.
- (Separately: `Dockerfile.dev` was also missing `dnsutils iproute2 tcpdump
  netcat-openbsd` — added, needs `docker compose build dev` — but this was a
  latent container gap, not Douglas's issue.)
