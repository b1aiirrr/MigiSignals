FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN NEXT_PUBLIC_WS_URL=ws://134.122.102.195:8080 npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
