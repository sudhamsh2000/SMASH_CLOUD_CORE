#!/bin/bash
# SMASH Cloud Core - Ubuntu Bootstrap Script
# Installs and configures Nextcloud, Nginx, MariaDB, PHP-FPM, Certbot, Fail2ban, UFW
# Usage: sudo bash scripts/smash_bootstrap.sh
# Updated: Enhanced error handling and logging

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

# Configuration variables (can be overridden by environment)
SMASH_DOMAIN=${SMASH_DOMAIN:-"smash.duckdns.org"}
SMASH_ADMIN_USER=${SMASH_ADMIN_USER:-"smash"}
SMASH_ADMIN_EMAIL=${SMASH_ADMIN_EMAIL:-"admin@example.com"}
SMASH_DB_NAME=${SMASH_DB_NAME:-"nextcloud"}
SMASH_DB_USER=${SMASH_DB_USER:-"smashuser"}
SMASH_DB_PASS=${SMASH_DB_PASS:-$(openssl rand -base64 32)}
SMASH_DB_ROOT=${SMASH_DB_ROOT:-$(openssl rand -base64 32)}
DATA_MOUNT=${DATA_MOUNT:-"/mnt/smash_data"}
NEXTCLOUD_DATA=${NEXTCLOUD_DATA:-"${DATA_MOUNT}/data"}

log "Starting SMASH Cloud Core bootstrap..."
log "Domain: ${SMASH_DOMAIN}"
log "Admin User: ${SMASH_ADMIN_USER}"
log "Data Mount: ${DATA_MOUNT}"

# Update system
log "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Nginx
log "Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# Install MariaDB
log "Installing MariaDB..."
apt install -y mariadb-server mariadb-client
systemctl enable mariadb
systemctl start mariadb

# Secure MariaDB installation
log "Securing MariaDB installation..."
mysql -e "DELETE FROM mysql.user WHERE User='';"
mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
mysql -e "DROP DATABASE IF EXISTS test;"
mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
mysql -e "CREATE DATABASE IF NOT EXISTS ${SMASH_DB_NAME};"
mysql -e "CREATE USER IF NOT EXISTS '${SMASH_DB_USER}'@'localhost' IDENTIFIED BY '${SMASH_DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${SMASH_DB_NAME}.* TO '${SMASH_DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Install PHP 8.3 and extensions
log "Installing PHP 8.3 and extensions..."
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y php8.3-fpm php8.3-cli php8.3-common php8.3-mysql php8.3-zip php8.3-gd php8.3-mbstring php8.3-curl php8.3-xml php8.3-bcmath php8.3-json php8.3-tokenizer php8.3-fileinfo php8.3-intl php8.3-imagick php8.3-redis php8.3-apcu

# Configure PHP-FPM
log "Configuring PHP-FPM..."
sed -i 's/;cgi.fix_pathinfo=1/cgi.fix_pathinfo=0/' /etc/php/8.3/fpm/php.ini
sed -i 's/upload_max_filesize = 2M/upload_max_filesize = 10G/' /etc/php/8.3/fpm/php.ini
sed -i 's/post_max_size = 8M/post_max_size = 10G/' /etc/php/8.3/fpm/php.ini
sed -i 's/max_execution_time = 30/max_execution_time = 300/' /etc/php/8.3/fpm/php.ini
sed -i 's/memory_limit = 128M/memory_limit = 512M/' /etc/php/8.3/fpm/php.ini

systemctl enable php8.3-fpm
systemctl restart php8.3-fpm

# Create data directory
log "Setting up data directory..."
mkdir -p "${DATA_MOUNT}"
mkdir -p "${NEXTCLOUD_DATA}"
chown -R www-data:www-data "${DATA_MOUNT}"
chmod -R 755 "${DATA_MOUNT}"

# Download and install Nextcloud
log "Downloading Nextcloud..."
cd /tmp
wget https://download.nextcloud.com/server/releases/latest.tar.bz2
tar -xjf latest.tar.bz2
mv nextcloud /var/www/
chown -R www-data:www-data /var/www/nextcloud
chmod -R 755 /var/www/nextcloud

# Configure Nginx
log "Configuring Nginx..."
cp /var/www/nextcloud/config/nginx/smash.conf /etc/nginx/sites-available/smash
ln -sf /etc/nginx/sites-available/smash /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t && systemctl reload nginx

# Install Certbot
log "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Install Fail2ban
log "Installing Fail2ban..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Configure Fail2ban for Nginx
log "Configuring Fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/smash.error.log
maxretry = 10
findtime = 600
bantime = 7200
EOF

systemctl restart fail2ban

# Configure UFW firewall
log "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Install additional tools
log "Installing additional tools..."
apt install -y htop iotop nethogs rsync

# Create systemd service for dashboard (placeholder)
log "Creating dashboard service..."
cat > /etc/systemd/system/smash-display@.service << EOF
[Unit]
Description=SMASH Cloud Display Dashboard
After=network.target

[Service]
Type=simple
User=%i
ExecStart=/usr/bin/python3 /opt/smash/scripts/smash_display.py
Restart=always
RestartSec=5
StandardOutput=tty
StandardError=tty
TTYPath=/dev/tty1

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# Create backup directory
log "Setting up backup directory..."
mkdir -p "${DATA_MOUNT}/backups"
chown -R www-data:www-data "${DATA_MOUNT}/backups"

# Save configuration
log "Saving configuration..."
cat > /opt/smash/smash.conf << EOF
# SMASH Cloud Core Configuration
SMASH_DOMAIN=${SMASH_DOMAIN}
SMASH_ADMIN_USER=${SMASH_ADMIN_USER}
SMASH_ADMIN_EMAIL=${SMASH_ADMIN_EMAIL}
SMASH_DB_NAME=${SMASH_DB_NAME}
SMASH_DB_USER=${SMASH_DB_USER}
SMASH_DB_PASS=${SMASH_DB_PASS}
SMASH_DB_ROOT=${SMASH_DB_ROOT}
DATA_MOUNT=${DATA_MOUNT}
NEXTCLOUD_DATA=${NEXTCLOUD_DATA}
EOF

chmod 600 /opt/smash/smash.conf

log "Bootstrap completed successfully!"
log "Next steps:"
log "1. Run: certbot --nginx -d ${SMASH_DOMAIN}"
log "2. Complete Nextcloud setup at https://${SMASH_DOMAIN}"
log "3. Enable dashboard: systemctl enable smash-display@${SMASH_ADMIN_USER}"
log "4. Check status: systemctl status nginx mariadb php8.3-fpm fail2ban"

# Display generated passwords
warn "Generated passwords saved to /opt/smash/smash.conf"
warn "Database password: ${SMASH_DB_PASS}"
warn "Database root password: ${SMASH_DB_ROOT}"
