FROM node:12

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm i
RUN npm run types

COPY ./src ./src
COPY ./tsconfig.json ./

RUN npm run types
RUN npm run build:prod

RUN chown -R node: /app
USER node

CMD ["npm", "run", "start:prod"]