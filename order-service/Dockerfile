FROM golang:1.24.7-alpine AS builder

ENV GOTOOLCHAIN=auto

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o order-service ./src/main.go

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/order-service .
COPY .env.example .env
EXPOSE 4000
CMD ["./order-service"]
