package models

import (
	"time"
)

type Order struct {
	ID         string    `json:"id"`
	ProductID  string    `json:"productId"`
	TotalPrice float64   `json:"totalPrice"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}