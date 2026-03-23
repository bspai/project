FROM node:20

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Generate Prisma Client (can also be done at runtime, but good to have prepared)
RUN npx prisma generate

# Expose port 3000 for the app
EXPOSE 3000

# Start command
CMD ["npm", "run", "dev"]
