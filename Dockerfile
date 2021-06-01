FROM node:12

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

COPY ./src ./src
COPY ./tsconfig.json ./

RUN npm run types
RUN npm run build:prod

RUN chown -R node: /app
USER node

CMD ["npm", "run", "start:prod"]