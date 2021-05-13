FROM node:12

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm i

COPY ./src ./src
COPY ./tsconfig.json ./

CMD [ "npm", "run", "start:prod"]