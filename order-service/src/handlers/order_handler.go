package handlers

import (
	"github.com/gofiber/fiber/v2"
	"order-service/src/services"
)

type OrderHandler struct {
	Service *services.OrderService
}

// CREATE ORDER
func (h *OrderHandler) CreateOrder(c *fiber.Ctx) error {
	var req struct {
		ProductID string `json:"productId"`
		Qty       int    `json:"qty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid input"})
	}

	order, err := h.Service.CreateOrder(req.ProductID, req.Qty)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(order)
}

// GET (by ID)
func (h *OrderHandler) GetOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	order, err := h.Service.GetOrderByID(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(order)
}

// GET ORDERS BY PRODUCT ID
func (h *OrderHandler) GetOrdersByProductID(c *fiber.Ctx) error {
	productId := c.Params("productId")

	orders, err := h.Service.GetOrdersByProductID(productId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(orders)
}

// READ ALL
func (h *OrderHandler) GetAllOrders(c *fiber.Ctx) error {
	orders, err := h.Service.GetAllOrders()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(orders)
}

// UPDATE
func (h *OrderHandler) UpdateOrder(c *fiber.Ctx) error {
	id := c.Params("id")

	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	order, err := h.Service.UpdateOrder(id, body.Status)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(order)
}

// DELETE
func (h *OrderHandler) DeleteOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	err := h.Service.DeleteOrder(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}
