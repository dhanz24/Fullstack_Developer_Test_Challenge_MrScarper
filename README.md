# Fullstack Developer Test Challenge - MrScraper

This repository contains a **Fullstack Developer Test Challenge** project consisting of two main microservices: **Product Service**(NestJS) and **Order Service**(Golang), integrated with PostgreSQL, Redis, and RabbitMQ.

---

## 🏗️ Project Structure
Fullstack_Developer_Test_Challenge_MrScarper
├── order-service
│ └── src
│ ├── config
│ ├── handlers
│ ├── middleware
│ ├── models
│ ├── routes
│ └── services
├── product-service
│ └── src
│ ├── common
│ ├── products
│ ├── rabbit-mq
│ └── redis
├── test
│ └── k6_order_test
├── dockerfile
├── .env
└── .env.example

- **order-service**: Handles order creation, retrieval, update, and deletion.
- **product-service**: Provides product data, integrated with Redis cache and RabbitMQ.
- **test/k6_order_test**: Load testing scripts for the order service.
- **docker-compose.yml**: Orchestrates PostgreSQL, Redis, RabbitMQ, and the two services.

---

## 🖥️ Architecture Overview

The architecture follows a **microservices pattern** with **event-driven communication**:

1. **Order Service**  
   - Handles order operations (CRUD) and publishes events to RabbitMQ.
   - Checks Redis cache for product data first; falls back to Product Service if cache miss.
   - Persists orders in PostgreSQL.

2. **Product Service**  
   - Serves product information.
   - Integrates with Redis for caching and publishes events to RabbitMQ.

3. **RabbitMQ**  
   - Used for event-driven communication between services (e.g., `order.created` events).

4. **Redis**  
   - Used as a cache layer to speed up product and order lookups.

5. **PostgreSQL**  
   - Stores persistent product and order data.

## 🚀 Setup Instructions

```bash
git clone <url-repo>
cd Fullstack_Developer_Test_Challenge_MrScraper

docker compose up --build
```

This will start the following services:
PostgreSQL: localhost:5432 (user: admin, password: admin, database: appdb)
Redis: localhost:6379
RabbitMQ: localhost:5672 (AMQP), Web UI: http://localhost:15672 (user: admin, password: admin)
Product Service: http://localhost:3000
Order Service: http://localhost:4000

## 📡 Example API Requests

This section demonstrates the flow from creating a product to creating an order, fetching cached data, and observing the event-driven behavior.

---

### 1) Create a Product

```bash
curl -X POST http://localhost:3000/products \
-H "Content-Type: application/json" \
-d '{
  "id": "p1",
  "name": "Laptop",
  "price": "1000",
  "qty": 10
}'
```
Response:
{
  "id": "p1",
  "name": "Laptop",
  "price": "1000",
  "qty": 10
}

### 2) Fetch Product (with Redis cache)
```bash
curl http://localhost:3000/products/p1
```

Notes:

First request hits Product Service DB.

Subsequent requests are served from Redis cache.

Response:

{
  "id": "p1",
  "name": "Laptop",
  "price": "1000",
  "qty": 10
}

### 3) Create an Order for Existing Product
```bash
curl -X POST http://localhost:4000/orders \
-H "Content-Type: application/json" \
-d '{
  "productId": "p1",
  "qty": 2
}'
```
Response:

{
  "id": "order-uuid",
  "productId": "p1",
  "totalPrice": 2000,
  "status": "created",
  "createdAt": "2025-10-05T07:00:00Z"
}


Event-Driven Flow:

On POST /orders, Order Service publishes an order.created event to RabbitMQ.

Order Service listens to order.created events and logs them asynchronously.

### 4) Fetch Orders by Product ID (cached)
```bash
curl http://localhost:4000/orders/product/p1
```
Notes:

First request queries DB.

Subsequent requests served from Redis cache.

Example response:

[
  {
    "id": "order-uuid",
    "productId": "p1",
    "totalPrice": 2000,
    "status": "created",
    "createdAt": "2025-10-05T07:00:00Z"
  }
]
