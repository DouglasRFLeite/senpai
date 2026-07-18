#!/usr/bin/env bash
# Container entrypoint for the dev environment.
# Installs deps if missing, then keeps the container alive so `docker compose exec` works.
set -e

if [ -f package.json ] && [ ! -d node_modules/.bin ]; then
  echo "==> Installing npm dependencies..."
  npm install
fi

if [ -f pyproject.toml ] && [ ! -d .venv ] && command -v uv >/dev/null 2>&1; then
  echo "==> Installing Python dependencies via uv..."
  uv sync
fi

if [ -f pom.xml ] && command -v mvn >/dev/null 2>&1 && [ ! -d ~/.m2/repository ]; then
  echo "==> Warming Maven dependency cache..."
  mvn -B -q dependency:go-offline || true
fi

if [ -f Gemfile ] && command -v bundle >/dev/null 2>&1 && [ ! -d vendor/bundle ]; then
  echo "==> Installing Ruby gems via bundle..."
  bundle config set --local path 'vendor/bundle'
  bundle install
fi

# Repo-scoped, push-only deploy key mounted read-only by docker-compose. Install it
# into ~/.ssh so `git push` over SSH works without the container ever holding the
# broad GH_TOKEN.
if [ -f /run/secrets/push_deploy_key ]; then
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  if ! cmp -s /run/secrets/push_deploy_key ~/.ssh/id_push_deploy 2>/dev/null; then
    cp /run/secrets/push_deploy_key ~/.ssh/id_push_deploy
    chmod 600 ~/.ssh/id_push_deploy
  fi
  if [ ! -f ~/.ssh/config ] || ! grep -q '^Host github.com$' ~/.ssh/config 2>/dev/null; then
    cat >> ~/.ssh/config <<'EOF'
Host github.com
    IdentityFile ~/.ssh/id_push_deploy
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new
EOF
    chmod 600 ~/.ssh/config
  fi
fi

exec tail -f /dev/null
