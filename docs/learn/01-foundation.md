# 01 · Foundation: containers, the gateway, and one login for every service

## What problem this layer solves

SMASH Cloud is several programs (an auth API, FRIDAY, VERONICA, a database, a web UI). Each
needs its own language runtime, libraries and configuration. The foundation answers three
questions:

1. **How does each program run reproducibly?** → one *container* per service
2. **How does the browser reach the right program?** → one *gateway* routing by URL
3. **How does every service know who you are?** → one *login* issuing a signed token

---

## 1. Containers and Docker Compose

### The concept

A **container image** is a frozen filesystem: an OS userland, Python, your libraries and your
code. A **container** is a running process started from that image, isolated from the host
and from other containers. "Works on my machine" stops being a problem because the machine
*is* the image.

A **Dockerfile** is the recipe for an image. Look at `services/smash-api/Dockerfile`:

```dockerfile
FROM python:3.12-slim          # start from an official image with Python installed
WORKDIR /srv                   # all following paths are relative to /srv
COPY requirements.txt .        # copy ONLY the dependency list first...
RUN pip install --no-cache-dir -r requirements.txt   # ...and install it
COPY app ./app                 # then copy the code
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Why copy `requirements.txt` before the code?** Docker caches each step (a *layer*). If only
your code changed, every step up to `COPY app` is reused from cache and the slow `pip install`
is skipped. Copy the code first and every one-character edit reinstalls all dependencies.

**Why `--host 0.0.0.0`?** Inside a container, `127.0.0.1` means "this container only". The
gateway is a *different* container, so the server must listen on all interfaces.

### Compose

`docker-compose.yml` declares all services together. Things to notice:

- **Service names are hostnames.** Compose creates a private network where the `friday`
  container can reach the database at `postgres:5432`. That's why `DATABASE_URL` says
  `@postgres:5432`, not `localhost`.
- **Ports.** `"127.0.0.1:8080:80"` on the gateway means "the Mac's port 8080, bound only to
  localhost, forwards to the container's port 80". Only the gateway (and Postgres, for your
  own debugging, on 5433) is published; every other service is reachable *only* through the
  gateway. Binding to `127.0.0.1` keeps it all off your Wi-Fi network.
- **Volumes.** `postgres_data:/var/lib/postgresql/data` stores the database outside the
  container, so `docker compose down` and rebuilds don't erase it.
- **Healthchecks + `depends_on: condition: service_healthy`.** FRIDAY creates tables at
  startup; if it started before Postgres accepted connections, it would crash. The
  healthcheck runs `pg_isready` every 5 s and Compose waits for it.
- **`env_file: .env`.** Secrets live in `.env` (gitignored), never in code or in the image.

> **Debugging story from this build.** The first `docker compose up` "hung" for 10 minutes.
> Every image had built, but every container sat in `Created`. Even `docker run alpine echo hi`
> hung, which proved the problem was Docker Desktop itself, not our code. Lesson: when
> something hangs, find the *smallest* command that reproduces it. Separately, port 5432
> was already taken by another project's Postgres, so ours publishes on 5433.

---

## 2. The gateway (Caddy)

### The concept: reverse proxy

The browser talks to one address, `localhost:8080`. A **reverse proxy** receives every request
and forwards it to the right internal service based on rules. From
`infrastructure/gateway/Caddyfile`:

```
handle /api/friday/*   → friday:8000      (with flush_interval -1)
handle /api/veronica/* → veronica:8000    (with flush_interval -1)
handle /api/*          → smash-api:8000
handle                 → dashboard:80     (everything else: the web app)
```

Order matters: more specific prefixes first, so `/api/friday/...` doesn't fall into the
generic `/api/*` rule.

**Why one front door?**
- **Same origin.** The web app and the APIs share `localhost:8080`, so the browser needs no
  CORS configuration, and later there's a single place to add HTTPS.
- **Services stay private.** Nothing but the gateway is exposed.
- **Swappable internals.** You could rewrite FRIDAY in another language and the browser
  would never know.

**`flush_interval -1`.** Proxies normally *buffer* responses for efficiency. FRIDAY and
VERONICA stream text a few characters at a time; buffering would hold it all until the end
and the "typing" effect would vanish. `-1` means "forward every byte immediately".

---

## 3. Authentication: one login, verified everywhere

### The flow

```
1. browser ──POST /api/auth/login {username, password}──▶ smash-api
2. smash-api checks the password, returns a JWT ◀──────────
3. browser stores it, then sends   Authorization: Bearer <JWT>   on every request
4. friday / veronica / smash-api each VERIFY the JWT themselves (no network call)
```

### What a JWT is

A JSON Web Token is three base64 pieces: `header.payload.signature`.

- **payload**: `{"sub": "admin", "exp": 1760000000, "iss": "smash-api"}`, i.e. who and when
  it expires. *Readable by anyone*; never put secrets in it.
- **signature**: `HMAC-SHA256(header.payload, SMASH_JWT_SECRET)`. Only someone holding the
  secret can produce a valid signature; changing a single character of the payload makes
  verification fail.

So any service that knows the shared secret can check "smash-api issued this, for this
user, and it hasn't expired" with pure math. This is **stateless** auth: no session
database, no call back to smash-api.

The trade-off: a JWT can't be revoked before it expires (there's no list to delete it
from). That's why `SMASH_JWT_TTL_HOURS` keeps it short (12 h) and why rotating
`SMASH_JWT_SECRET` instantly logs everyone out.

### Code walkthrough: `services/smash-api/app/auth.py`

```python
user_ok = hmac.compare_digest(body.username, settings.smash_admin_username)
pass_ok = hmac.compare_digest(body.password, settings.smash_admin_password)
```

**Why not `==`?** A normal string comparison stops at the first mismatched character, so
a wrong password that shares a longer prefix with the real one takes slightly longer to
reject. An attacker timing millions of attempts can recover the password a character at a
time. `compare_digest` always takes the same time. (This is a *timing attack*.)

`require_user` is a FastAPI **dependency**: any endpoint that declares
`_: str = Depends(require_user)` gets the token checked before its body runs, and a
missing/invalid token becomes an automatic `401`.

### Known limitations (deliberate, for now)

- One owner account from `.env`, plain-text password compared directly. Fine for one person
  on localhost; before SMASH Cloud is exposed to the internet this becomes a users table
  with **argon2** password hashes, rate-limited login, and HTTPS.
- The token lives in `localStorage`, which any script on the page can read. An
  `HttpOnly` cookie is safer against XSS; worth switching when the app grows.

---

## Exercises

1. **Read a token.** Log in, then in the browser console run
   `JSON.parse(atob(localStorage['smash.token'].split('.')[1]))`. You'll see `sub` and `exp`.
   Notice you didn't need the secret to *read* it.
2. **Break a token.** Change one character of the token in `localStorage` and reload. Which
   service rejects it, and with what status code?
3. **Watch routing.** `docker compose logs -f gateway` while clicking around the dashboard.
4. **Prove isolation.** `curl localhost:8000/api/health`; it fails. Now
   `docker compose exec gateway wget -qO- http://smash-api:8000/api/health`; it works.
   Why? (Hint: which network is each command on?)
5. **Layer caching.** Edit a comment in `services/smash-api/app/main.py`, run
   `docker compose build smash-api`, and see which steps say `CACHED`.
