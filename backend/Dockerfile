FROM node:20-alpine

WORKDIR /app

# Install production dependencies with layer caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Ensure storage directories exist
RUN mkdir -p uploads logs

# Expose backend port
EXPOSE 3001

# Healthcheck to verify server is responding
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the Node.js production server
CMD ["node", "index.js"]
