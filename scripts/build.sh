#!/usr/bin/env bash
# Production build. Scala.js compilation needs sbt and a JDK. Hosted builders
# (e.g. Cloudflare's git-connected builds) have neither, so when sbt isn't on
# the PATH we download a JDK and sbt into .toolchain/ first. Local machines
# with sbt installed skip straight to the build.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v sbt >/dev/null 2>&1; then
  if [ "$(uname -s)" != "Linux" ]; then
    echo "sbt not found. Install it (e.g. 'brew install sbt') and retry." >&2
    exit 1
  fi

  TC="$PWD/.toolchain"
  mkdir -p "$TC"
  case "$(uname -m)" in
    x86_64)        ARCH=x64 ;;
    aarch64|arm64) ARCH=aarch64 ;;
    *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac

  if ! java -version >/dev/null 2>&1; then
    if [ ! -x "$TC/jdk/bin/java" ]; then
      echo "==> Downloading JDK 21 (Temurin, linux/$ARCH)"
      mkdir -p "$TC/jdk"
      curl -fsSL "https://api.adoptium.net/v3/binary/latest/21/ga/linux/$ARCH/jdk/hotspot/normal/eclipse" \
        | tar -xz -C "$TC/jdk" --strip-components=1
    fi
    export JAVA_HOME="$TC/jdk"
    export PATH="$JAVA_HOME/bin:$PATH"
  fi

  SBT_VERSION="$(sed -n 's/^sbt\.version *= *//p' project/build.properties | tr -d '[:space:]')"
  if [ ! -x "$TC/sbt/bin/sbt" ]; then
    echo "==> Downloading sbt $SBT_VERSION"
    curl -fsSL "https://github.com/sbt/sbt/releases/download/v$SBT_VERSION/sbt-$SBT_VERSION.tgz" \
      | tar -xz -C "$TC"
  fi
  export PATH="$TC/sbt/bin:$PATH"
fi

exec npx vite build
