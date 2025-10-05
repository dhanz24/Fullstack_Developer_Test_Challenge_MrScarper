package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"

	"order-service/src/config"
	"order-service/src/handlers"
	"order-service/src/services"
	"order-service/src/routes"
	"order-service/src/middleware"
)

func main() {
	_ = godotenv.Load()

	app := fiber.New()

	app.Use(middleware.AddRequestID())
	app.Use(middleware.GlobalErrorHandler())

	db, err := config.ConnectDB()
	if err != nil {
		log.Fatal("❌ DB Connection Error:", err)
	}

	rmqConn, rmqCh, err := config.ConnectRabbitMQ()
	if err != nil {
		log.Fatal("❌ RabbitMQ Connection Error:", err)
	}
	defer rmqConn.Close()
	defer rmqCh.Close()

	redisClient := config.ConnectRedis()

	service := &services.OrderService{
		DB: db,
		RMQCh: rmqCh,
		Redis: redisClient,
		ProductServiceURL: os.Getenv("PRODUCT_SERVICE_URL"),
	}
	
	handler := &handlers.OrderHandler{Service: service}

	routes.OrderRoutes(app, handler)

	port := os.Getenv("APP_PORT")
	log.Println("🚀 Order service running on port", port)
	app.Listen(":" + port)
}