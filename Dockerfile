FROM node:18-alpine

# Install build dependencies required for onoff
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Copy package.json first
COPY package.json .

# Install dependencies
RUN npm install

# Copy app files
COPY app.js .
COPY public public

CMD ["node", "app.js"]
