package middleware

import (
	"github.com/gofiber/fiber/v2"
	"log"
)

// GlobalErrorHandler handles all errors in a consistent format
func GlobalErrorHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				requestID := c.Locals("request_id")
				log.Printf("❌ Panic recovered: %v | RequestID: %v\n", r, requestID)
				c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":      "internal server error",
					"request_id": requestID,
				})
			}
		}()
		err := c.Next()
		if err != nil {
			requestID := c.Locals("request_id")
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			log.Printf("⚠️ Error: %v | RequestID: %v\n", err, requestID)
			return c.Status(code).JSON(fiber.Map{
				"error":      err.Error(),
				"request_id": requestID,
			})
		}
		return nil
	}
}
