package routes

import (
	"github.com/gofiber/fiber/v2"
	"order-service/src/handlers"
)

func OrderRoutes(app *fiber.App, h *handlers.OrderHandler) {
	api := app.Group("/orders")

	api.Post("/", h.CreateOrder)
	api.Get("/", h.GetAllOrders)
	api.Get("/products/:id", h.GetOrder)
	api.Get("/product/:productId", h.GetOrdersByProductID)
	api.Put("/:id", h.UpdateOrder)
	api.Delete("/:id", h.DeleteOrder)
}
