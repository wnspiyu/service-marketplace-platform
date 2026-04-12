FROM node:18-alpine
WORKDIR /app

RUN npm install -g serve && npm cache clean --force

COPY build ./build

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
