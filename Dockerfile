FROM node:20-slim

# Set application directory
WORKDIR /usr/src/app

COPY package*.json ./

# Install dependencies
RUN npm install

# Install Playwright browsers with dependencies
RUN npx playwright install chromium --with-deps

COPY . .

CMD ["npm", "start"]
