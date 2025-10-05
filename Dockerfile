FROM node:20-alpine AS dev
ENV NPM_CONFIG_LOGLEVEL=warn
RUN apk update && \
    apk add git make gcc g++ && \
    rm -rf /var/cache/apk/*

WORKDIR /home/node/app
COPY package.json ./
COPY tsconfig.json ./
COPY . .
RUN npm update && npm install && npm run build
ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM node:20-alpine AS prod
WORKDIR /home/node/app
COPY --from=dev /home/node/app/node_modules ./node_modules
COPY --from=dev /home/node/app/dist ./dist
COPY --from=dev /home/node/app/package.json ./
COPY --from=dev /home/node/app/tsconfig.json ./

ENV NPM_CONFIG_LOGLEVEL=warn \
    NODE_ENV=production \
    PORT=3000
EXPOSE 3000
CMD ["node", "dist/main.js"]
