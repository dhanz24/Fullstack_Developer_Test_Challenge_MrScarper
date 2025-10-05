package models

import (
	"time"

	"gorm.io/gorm"
)

type Order struct {
	ID         string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	ProductID  string         `gorm:"not null" json:"productId"`
	TotalPrice float64        `gorm:"not null" json:"totalPrice"`
	Status     string         `gorm:"not null;default:'pending'" json:"status"`
	CreatedAt  time.Time      `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
