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
```bash
{
  "id": "p1",
  "name": "Laptop",
  "price": "1000",
  "qty": 10
}
```

### 2) Fetch Product (with Redis cache)
```bash
curl http://localhost:3000/products/p1
```

Notes:

First request hits Product Service DB.

Subsequent requests are served from Redis cache.

Response:
```bash
{
  "id": "p1",
  "name": "Laptop",
  "price": "1000",
  "qty": 10
}
```

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
```bash
{
  "id": "order-uuid",
  "productId": "p1",
  "totalPrice": 2000,
  "status": "created",
  "createdAt": "2025-10-05T07:00:00Z"
}
```

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
```bash
[
  {
    "id": "order-uuid",
    "productId": "p1",
    "totalPrice": 2000,
    "status": "created",
    "createdAt": "2025-10-05T07:00:00Z"
  }
]
```

## 📡 Example with HTTPie (apps like Postman but lighter)


### 1) Create a Product
<img width="1919" height="676" alt="image" src="https://github.com/user-attachments/assets/b07669f2-262a-41d3-a8b8-75d988ed8d59" />

### 2) Fetch Product (with Redis cache)
<img width="1919" height="690" alt="image" src="https://github.com/user-attachments/assets/68ece090-4dd3-48ab-b0cb-448914eac917" />

### 3) Create an Order for Existing Product
<img width="1919" height="681" alt="image" src="https://github.com/user-attachments/assets/4c18188b-0fa1-4886-922e-9a34fb2714be" />

### 4) Fetch Orders by Product ID (cached)
<img width="1919" height="790" alt="image" src="https://github.com/user-attachments/assets/187f28e7-f3c3-4488-be24-35918b9863e5" />


## 📡 Test with 1000 request
<img width="1919" height="1079" alt="Screenshot 2025-10-05 195642" src="https://github.com/user-attachments/assets/6858bb9e-a328-4ae4-b088-872125eeee7c" />

## Unit Test using Jest
<img width="936" height="752" alt="image" src="https://github.com/user-attachments/assets/4f8ac05d-b2fa-4767-935c-b1982b48ed2d" />

## Video recording of the task result

https://youtu.be/PLqDoYvpufY

