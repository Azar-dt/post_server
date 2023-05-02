FROM node:14-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn  
RUN yarn global add typescript

COPY . .

ENV NODE_ENV=production

# run yarn build and yarn start
RUN yarn build  

EXPOSE 4000

CMD [ "yarn", "start"]
