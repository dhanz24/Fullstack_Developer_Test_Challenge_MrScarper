package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// AddRequestID adds a unique request ID to each request and response header
func AddRequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.NewString()
		}

		c.Locals("request_id", requestID)
		c.Set("X-Request-ID", requestID)

		return c.Next()
	}
}