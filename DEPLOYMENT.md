# 🚀 Guía de Deployment - AWS

Esta guía te ayudará a desplegar ALS V2 en Amazon Web Services (AWS).

---

## 📋 Requisitos Previos

- Cuenta de AWS
- AWS CLI instalado y configurado
- Node.js 18+ instalado
- Git instalado
- Ollama instalado en tu servidor

---

## 🏗️ Arquitectura de Deployment

```
┌─────────────────────────────────────────┐
│         AWS Cloud                        │
│                                          │
│  ┌────────────────────────────────┐    │
│  │   EC2 Instance (Frontend)      │    │
│  │   - React App (Build estático) │    │
│  │   - Nginx                       │    │
│  │   - SSL Certificate             │    │
│  └────────────────────────────────┘    │
│                                          │
│  ┌────────────────────────────────┐    │
│  │   EC2 Instance (Backend)       │    │
│  │   - Node.js Express API        │    │
│  │   - Prisma + SQLite            │    │
│  │   - Ollama Service             │    │
│  └────────────────────────────────┘    │
│                                          │
│  ┌────────────────────────────────┐    │
│  │   S3 Bucket                    │    │
│  │   - File Storage (Uploads)     │    │
│  └────────────────────────────────┘    │
│                                          │
│  ┌────────────────────────────────┐    │
│  │   Route 53 (Optional)          │    │
│  │   - DNS Management             │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 🎯 Opción 1: Deployment en EC2 (Recomendado)

### 1. Crear Instancia EC2

```bash
# Configuración recomendada:
# - AMI: Ubuntu 22.04 LTS
# - Tipo: t3.medium (2 vCPU, 4 GB RAM mínimo)
# - Almacenamiento: 30 GB SSD
# - Security Group: Permitir puertos 22, 80, 443, 3000
```

### 2. Conectar a la Instancia

```bash
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

### 3. Instalar Dependencias

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Git
sudo apt install -y git

# Instalar PM2 (Process Manager)
sudo npm install -g pm2

# Instalar Nginx
sudo apt install -y nginx

# Instalar Ollama
curl https://ollama.ai/install.sh | sh

# Descargar modelo
ollama pull llama3.2:3b
```

### 4. Clonar Repositorio

```bash
cd /home/ubuntu
git clone <your-repository-url> als-v2
cd als-v2
```

### 5. Configurar Backend

```bash
cd server

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env
nano .env

# Editar las siguientes variables:
# DATABASE_URL="file:./production.db"
# JWT_SECRET="your-super-secret-production-key"
# PORT=3000
# CORS_ORIGIN="https://your-frontend-domain.com"
# OLLAMA_BASE_URL="http://localhost:11434"
# NODE_ENV="production"

# Generar Prisma Client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy

# Construir TypeScript
npm run build

# Iniciar con PM2
pm2 start dist/server.js --name als-backend
pm2 save
pm2 startup
```

### 6. Configurar Frontend

```bash
cd ../client

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env
nano .env

# Editar:
# VITE_API_URL=https://api.your-domain.com

# Build de producción
npm run build

# Los archivos están en dist/
```

### 7. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/als-frontend
```

Agregar:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /home/ubuntu/als-v2/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/als-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Configurar SSL (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 9. Verificar Deployment

```bash
# Ver logs del backend
pm2 logs als-backend

# Ver estado
pm2 status

# Reiniciar si es necesario
pm2 restart als-backend
```

---

## 🎯 Opción 2: Deployment con Docker (Alternativa)

### 1. Crear Dockerfile para Backend

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### 2. Crear Dockerfile para Frontend

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./server/uploads:/app/uploads
      - ./server/prisma:/app/prisma

  frontend:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - backend
```

```bash
docker-compose up -d
```

---

## 📊 Monitoreo y Mantenimiento

### PM2 Commands

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs als-backend

# Reiniciar
pm2 restart als-backend

# Stop
pm2 stop als-backend

# Ver uso de recursos
pm2 monit
```

### Respaldos Automáticos de BD

```bash
# Crear script de backup
nano /home/ubuntu/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /home/ubuntu/als-v2/server/production.db /home/ubuntu/backups/db_$DATE.db
# Mantener solo últimos 7 días
find /home/ubuntu/backups -name "db_*.db" -mtime +7 -delete
```

```bash
chmod +x /home/ubuntu/backup-db.sh

# Agregar a crontab (diario a las 2 AM)
crontab -e
0 2 * * * /home/ubuntu/backup-db.sh
```

---

## 🔒 Seguridad

### 1. Firewall (UFW)

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Actualizar JWT_SECRET

```bash
# Generar secret seguro
openssl rand -base64 32

# Actualizar en .env
nano /home/ubuntu/als-v2/server/.env
```

---

## 🌐 Configurar Dominio (Route 53)

1. En AWS Console → Route 53
2. Crear Hosted Zone
3. Agregar Record Type A → IP de EC2
4. Actualizar nameservers en tu registrador de dominios

---

## ⚡ Optimizaciones

### 1. Cachear Assets Estáticos

En nginx.conf:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Comprimir Respuestas

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 3. Limitar Tamaño de Upload

```nginx
client_max_body_size 50M;
```

---

## 🆘 Troubleshooting

### Backend no inicia

```bash
pm2 logs als-backend --lines 100
```

### Ollama no responde

```bash
sudo systemctl status ollama
ollama list
```

### Error de base de datos

```bash
cd /home/ubuntu/als-v2/server
npx prisma migrate reset --force
npx prisma migrate deploy
```

---

## 📞 Soporte

Para problemas específicos de AWS, consultar documentación oficial:
- https://docs.aws.amazon.com/ec2/
- https://docs.aws.amazon.com/s3/

---

**¡Listo para producción!** 🚀
