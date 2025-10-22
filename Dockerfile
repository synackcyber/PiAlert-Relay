FROM node:18-alpine

# Install libgpiod tools for GPIO access
RUN apk add --no-cache libgpiod

WORKDIR /app

# Copy package.json first
COPY package.json .

# Install dependencies
RUN npm install

# Copy app files
COPY app.js .
COPY public public

CMD ["node", "app.js"]
