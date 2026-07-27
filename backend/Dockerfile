FROM python:3.12.13-slim-bookworm@sha256:d50fb7611f86d04a3b0471b46d7557818d88983fc3136726336b2a4c657aa30b

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/srv/mkt53/src \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv/mkt53

RUN groupadd --gid 10001 mkt53 && \
    useradd --uid 10001 --gid 10001 --create-home --home-dir /home/mkt53 --shell /usr/sbin/nologin mkt53

COPY requirements.lock ./requirements.lock
RUN python -m pip install --requirement requirements.lock

COPY pyproject.toml alembic.ini ./
COPY src ./src
COPY migrations ./migrations

RUN python -m compileall -q src migrations && chown -R 10001:10001 /srv/mkt53

USER 10001:10001
EXPOSE 8000

CMD ["uvicorn", "mkt53_backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-server-header"]
