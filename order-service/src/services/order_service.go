package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"order-service/src/models"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrderService struct {
	DB                *pgxpool.Pool
	RMQCh             *amqp.Channel
	Redis             *redis.Client
	ProductServiceURL string
}

// --- CREATE ORDER (non-blocking)
func (s *OrderService) CreateOrder(ctx context.Context, productId string, qty int) (*models.Order, error) {
	cacheKey := fmt.Sprintf("product:%s", productId)

	// 🧩 1. Ambil data product dari Redis cache
	var product struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Price string `json:"price"`
		Qty   int    `json:"qty"`
	}

	cached, err := s.Redis.Get(ctx, cacheKey).Result()
	if err == nil && cached != "" {
		json.Unmarshal([]byte(cached), &product)
	} else {
		// 🚀 Jika tidak ada di cache, ambil dari product-service
		resp, err := http.Get(fmt.Sprintf("%s/products/%s", s.ProductServiceURL, productId))
		if err != nil || resp.StatusCode != http.StatusOK {
			return nil, errors.New("product not found")
		}
		defer resp.Body.Close()

		if err := json.NewDecoder(resp.Body).Decode(&product); err != nil {
			return nil, errors.New("failed to decode product data")
		}

		// Simpan ke Redis cache
		data, _ := json.Marshal(product)
		s.Redis.Set(ctx, cacheKey, data, 5*time.Minute)
	}

	// 🧩 2. Validasi stok & hitung harga total
	price, err := strconv.ParseFloat(product.Price, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid product price: %v", err)
	}
	if qty > product.Qty {
		return nil, fmt.Errorf("insufficient stock: available %d, requested %d", product.Qty, qty)
	}

	totalPrice := float64(qty) * price
	orderID := uuid.NewString()

	// 🧩 3. Simpan order ke database
	query := `
		INSERT INTO orders (id, product_id, total_price, status, created_at)
		VALUES ($1, $2, $3, 'created', NOW())
	`
	_, err = s.DB.Exec(ctx, query, orderID, productId, totalPrice)
	if err != nil {
		return nil, fmt.Errorf("failed to insert order: %v", err)
	}

	order := &models.Order{
		ID:         orderID,
		ProductID:  productId,
		TotalPrice: totalPrice,
		Status:     "created",
		CreatedAt:  time.Now(),
	}

	// 🧩 4. Jalankan proses non-blocking
	go func() {
		bgCtx := context.Background()

		// 🔹 Invalidate cache order list per product
		s.Redis.Del(bgCtx, fmt.Sprintf("orders:product:%s", productId))

		// 🔹 Publish event ke RabbitMQ
		bodyData := map[string]interface{}{
			"orderId":   orderID,
			"productId": productId,
			"qty":       qty,
		}
		body, _ := json.Marshal(bodyData)

		err := s.RMQCh.PublishWithContext(
			bgCtx,
			"events",
			"order.created",
			false,
			false,
			amqp.Publishing{
				ContentType: "application/json",
				Body:        body,
			},
		)
		if err != nil {
			log.Printf("⚠️ Failed to publish order.created event: %v", err)
		}
	}()

	return order, nil
}

// --- GET ORDERS BY PRODUCT ID (cached)
func (s *OrderService) GetOrdersByProductID(ctx context.Context, productId string) ([]models.Order, error) {
	cacheKey := fmt.Sprintf("orders:product:%s", productId)

	// 🔹 Cek cache Redis
	cached, err := s.Redis.Get(ctx, cacheKey).Result()
	if err == nil && cached != "" {
		var orders []models.Order
		if json.Unmarshal([]byte(cached), &orders) == nil {
			fmt.Println("✅ Cache hit for product:", productId)
			return orders, nil
		}
	}

	// 🔹 Query dari DB
	query := `
		SELECT id, product_id, total_price, status, created_at
		FROM orders
		WHERE product_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.DB.Query(ctx, query, productId)
	if err != nil {
		return nil, fmt.Errorf("failed to query orders: %v", err)
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.ProductID, &o.TotalPrice, &o.Status, &o.CreatedAt); err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}

	// 🔹 Simpan hasil query ke Redis (asynchronous)
	go func() {
		data, _ := json.Marshal(orders)
		s.Redis.Set(context.Background(), cacheKey, data, 10*time.Minute)
	}()

	return orders, nil
}


// GetOrderByID mengambil data order berdasarkan ID
func (s *OrderService) GetOrderByID(ctx context.Context, id string) (*models.Order, error) {
	const query = `
		SELECT id, customer_name, status, created_at, updated_at
		FROM orders
		WHERE id = $1
	`
	var order models.Order
	err := s.DB.QueryRow(ctx, query, id).Scan(
		&order.ID,
		&order.Status,
		&order.CreatedAt,
		&order.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return nil, err
		}
		return nil, err
	}
	return &order, nil
}

// GetAllOrders mengambil semua data order
func (s *OrderService) GetAllOrders(ctx context.Context) ([]models.Order, error) {
	const query = `
		SELECT id, customer_name, status, created_at, updated_at
		FROM orders
		ORDER BY created_at DESC
	`
	rows, err := s.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var order models.Order
		if err := rows.Scan(
			&order.ID,
			&order.Status,
			&order.CreatedAt,
			&order.UpdatedAt,
		); err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}

	return orders, nil
}

// UpdateOrder memperbarui status order
func (s *OrderService) UpdateOrder(ctx context.Context, id string, newStatus string) (*models.Order, error) {
	const query = `
		UPDATE orders
		SET status = $1, updated_at = $2
		WHERE id = $3
		RETURNING id, customer_name, status, created_at, updated_at
	`
	var order models.Order
	err := s.DB.QueryRow(ctx, query, newStatus, time.Now(), id).Scan(
		&order.ID,
		&order.Status,
		&order.CreatedAt,
		&order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// DeleteOrder menghapus order berdasarkan ID
func (s *OrderService) DeleteOrder(ctx context.Context, id string) error {
	const query = `DELETE FROM orders WHERE id = $1`
	_, err := s.DB.Exec(ctx, query, id)
	return err
}
