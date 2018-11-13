FROM node:8 AS builder
WORKDIR /src
COPY package.json /src
RUN npm install --env=production

FROM node:8-alpine
RUN mkdir /app
WORKDIR /app
COPY --from=builder /src /app
COPY . /app
ENTRYPOINT ["node"]