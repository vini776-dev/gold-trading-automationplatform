# GTAP Production Deployment Guide (DEPLOYMENT.md)

This document provides step-by-step instructions to configure, deploy, run, and scale the Gold Trading Automation Platform (GTAP) on a production Ubuntu VPS.

---

## 1. VPS Setup & System Requirements
* **OS:** Ubuntu Server 22.04 LTS (x86_64).
* **RAM:** 2GB minimum (to run MT5, Node.js, and Python concurrently).
* **Prerequisites:**
  ```bash
  sudo apt update && sudo apt upgrade -y
  sudo apt install -y nodejs npm python3 python3-pip git nginx curl
  ```

---

## 2. MetaTrader 5 Setup on Linux (Wine)
MT5 is a Windows application. To run it on a headless Linux VPS:
1. Install Wine:
   ```bash
   sudo dpkg --add-architecture i386
   sudo mkdir -pm755 /etc/apt/keyrings
   sudo wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key
   sudo wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources
   sudo apt update
   sudo apt install --install-recommends winehq-stable -y
   ```
2. Install MT5 inside Wine environment and keep it running in a virtual display (`Xvfb`).

---

## 3. MongoDB Atlas Setup
1. Create a free cluster on MongoDB Atlas.
2. Under Network Access, whitelist the IP address of your VPS.
3. Generate a connection string (e.g. `mongodb+srv://admin:<password>@cluster.mongodb.net/gtap?retryWrites=true&w=majority`).

---

## 4. Production Environment Variables
Create `/var/www/gtap/server/.env`:
```text
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://admin:pass@cluster.mongodb.net/gtap
JWT_SECRET=super_secure_random_jwt_secret_key
CLIENT_URL=https://yourdomain.com
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@gtap.com
ADMIN_PASSWORD=adminproductionpassword
INTERNAL_API_KEY=another_secure_pre_shared_secret_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

Create `/var/www/gtap/trading-engine/.env`:
```text
MT5_LOGIN=your_mt5_account
MT5_PASSWORD=your_mt5_password
MT5_SERVER=broker_server_name
NODE_API_URL=http://localhost:5000/api/v1
INTERNAL_API_KEY=another_secure_pre_shared_secret_key
DRY_RUN=False
```

---

## 5. Nginx Reverse Proxy & SSL Setup
Configure Nginx as a reverse proxy for Node.js (REST & WebSockets) and serve static client files.

### Nginx Configuration (`/etc/nginx/sites-available/gtap`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve Frontend Client static files
    location / {
        root /var/www/gtap/client;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # Proxy REST API requests
    location /api/v1/ {
        proxy_pass http://localhost:5000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Socket.IO WebSockets connections
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Enable the site and obtain SSL using Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/gtap /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

## 6. PM2 Process Manager Configuration
PM2 keeps both the Node.js server and the Python Trading Engine running permanently in the background.

Create `ecosystem.config.js` in root:
```javascript
module.exports = {
  apps: [
    {
      name: "gtap-backend",
      script: "./server/src/server.js",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "gtap-trading-engine",
      script: "python3",
      args: "./trading-engine/main.py",
      autorestart: true,
      watch: false
    }
  ]
};
```
Start processes:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 7. Backup & Restore Procedures
* **Database Backup:**
  ```bash
  mongodump --uri="mongodb+srv://admin:pass@cluster.mongodb.net/gtap" --out=/backups/$(date +%F)
  ```
* **Restore:**
  ```bash
  mongorestore --uri="mongodb+srv://admin:pass@cluster.mongodb.net/gtap" /backups/2026-07-09/gtap
  ```

---

## 8. Future Improvements
* **Redis & BullMQ:** Upgrading the asynchronous Telegram notification dispatch queue to run on Redis and BullMQ, providing persistence across restarts and preventing memory leaks on high workloads.
* **Multi-User Architecture:** Enhancing DB models and API parameters to support separate workspaces, individual broker account credentials, and strategy parameters per registered user.
* **Docker Setup:** Dockerizing the Node.js and Python engines to enable easy portability and environment parity across staging and production VPS.
* **CI/CD Pipeline:** Setting up GitHub Actions to run automated testing suites and handle rolling auto-deployments to the VPS on commits.
* **Prometheus & Grafana:** Monitoring CPU workloads, process memory, and trading execution latencies using Prometheus exporters and Grafana visualization dashboards.
