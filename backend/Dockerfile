FROM node:18-alpine

WORKDIR /app

# Copia manifestos (assumindo que o package.json do backend está em backend/)
COPY package*.json ./

# Instala apenas deps de produção
RUN npm ci --omit=dev

# Copia o restante do backend
COPY . .

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Inicia o servidor
CMD ["node", "src/server.js"]
