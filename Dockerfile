from node:18-alpine3.16
workdir /usr/src/app
copy package.json yarn.lock ./
run yarn install --production
COPY . .

EXPOSE 80
CMD ["node", "src/server.js"]
