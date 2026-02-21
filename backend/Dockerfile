FROM python:3.12-slim

# uv バイナリを公式イメージからコピー（バージョン固定で再現性を保証）
COPY --from=ghcr.io/astral-sh/uv:0.6.6 /uv /usr/local/bin/uv

WORKDIR /app

# 非rootユーザーを作成（最小権限の原則）
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# 依存関係ファイルを先にコピー（レイヤーキャッシュを最大化）
COPY pyproject.toml uv.lock ./

# 本番依存のみインストール（dev グループを除外）
RUN uv sync --frozen --no-dev

# アプリケーションコードをコピー
COPY . .

# ファイルの所有権を appuser に変更
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
