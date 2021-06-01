FROM node:12

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

COPY ./src ./src
COPY ./tsconfig.json ./

RUN npm i
RUN npm run build:prod

CMD ["npm", "run", "start:prod"]