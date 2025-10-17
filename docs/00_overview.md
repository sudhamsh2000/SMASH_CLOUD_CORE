# SMASH Cloud Core — Overview

- Purpose: Self-hosted personal cloud with AI-ready architecture.
- Core stack: Nextcloud + Nginx + MariaDB; Caddy for local TLS.
- Security: UFW, Fail2ban, auto TLS (Let’s Encrypt), hardening.
- Deployment: Docker Compose (local), Bash + systemd (Ubuntu server).
- Storage: Mounted at /mnt/smash_data with snapshot backups.
