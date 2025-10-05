package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"
	"strconv"

	"order-service/src/models"

	amqp "github.com/rabbitmq/amqp091-go"
	"gorm.io/gorm"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

type OrderService struct {
	DB                *gorm.DB
	RMQCh             *amqp.Channel
	Redis             *redis.Client
	ProductServiceURL string
}

// CREATE ORDER
func (s *OrderService) CreateOrder(productId string, qty int) (*models.Order, error) {
	// Ambil data product dari product-service
	resp, err := http.Get(fmt.Sprintf("%s/products/%s", s.ProductServiceURL, productId))
	if err != nil || resp.StatusCode != 200 {
		return nil, errors.New("product not found")
	}
	defer resp.Body.Close()

	var product struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Price string `json:"price"` // <-- string
		Qty   int    `json:"qty"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&product); err != nil {
		return nil, errors.New("failed to decode product data")
	}

	// convert price ke float64
	price, err := strconv.ParseFloat(product.Price, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid product price: %v", err)
	}

	// total price
	totalPrice := float64(qty) * price


	// Cek stok
	if qty > product.Qty {
		return nil, fmt.Errorf("insufficient stock: available %d, requested %d", product.Qty, qty)
	}

	// Create order di DB
	order := models.Order{
		ID:         uuid.NewString(),
		ProductID:  productId,
		TotalPrice: totalPrice,
		Status:     "created",
		CreatedAt:  time.Now(),
	}
	if err := s.DB.Create(&order).Error; err != nil {
		return nil, err
	}

	s.Redis.Del(context.Background(), fmt.Sprintf("orders:product:%s", productId))

	// publish event ke rabbitmq
	bodyData := struct {
		OrderID   string `json:"orderId"`
		ProductID string `json:"productId"`
		Qty       int    `json:"qty"`
	}{
		OrderID:   order.ID,
		ProductID: productId,
		Qty:       qty,
	}
	body, _ := json.Marshal(bodyData)
	err = s.RMQCh.PublishWithContext(
		context.Background(),
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
		log.Println("⚠️ Failed to publish event:", err)
	}

	return &order, nil
}

// get orders by product ID with caching
func (s *OrderService) GetOrdersByProductID(productId string) ([]models.Order, error) {
	ctx := context.Background()
	key := fmt.Sprintf("orders:product:%s", productId)

	// cek cache di Redis
	cached, err := s.Redis.LRange(ctx, key, 0, -1).Result()
	if err == nil && len(cached) > 0 {
		orders := make([]models.Order, 0, len(cached))
		for _, item := range cached {
			var o models.Order
			json.Unmarshal([]byte(item), &o)
			orders = append(orders, o)
		}
		fmt.Println("✅ Using cached data from Redis")
		return orders, nil
	}

	// ambil dari DB
	var orders []models.Order
	if err := s.DB.Where("product_id = ?", productId).
		Order("created_at desc").
		Find(&orders).Error; err != nil {
		return nil, err
	}

	// update cache
	s.Redis.Del(ctx, key) // ✅ fix
	for _, o := range orders {
		data, _ := json.Marshal(o)
		s.Redis.RPush(ctx, key, data) // ✅ fix
	}
	s.Redis.Expire(ctx, key, 10*time.Minute)

	fmt.Println("💾 Data cached to Redis")
	return orders, nil
}

// get order by ID
func (s *OrderService) GetOrderByID(id string) (*models.Order, error) {
	var order models.Order
	if err := s.DB.First(&order, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &order, nil
}

func (s *OrderService) GetAllOrders() ([]models.Order, error) {
	var orders []models.Order
	if err := s.DB.Order("created_at desc").Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (s *OrderService) UpdateOrder(id string, newStatus string) (*models.Order, error) {
	order, err := s.GetOrderByID(id)
	if err != nil {
		return nil, err
	}
	order.Status = newStatus
	if err := s.DB.Save(order).Error; err != nil {
		return nil, err
	}
	return order, nil
}

func (s *OrderService) DeleteOrder(id string) error {
	return s.DB.Delete(&models.Order{}, "id = ?", id).Error
}
