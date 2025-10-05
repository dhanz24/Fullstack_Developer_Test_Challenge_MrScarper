package config

import (
	"context"
	"fmt"
	"os"

	"github.com/go-redis/redis/v8"
)

var RedisClient *redis.Client

func ConnectRedis() *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", os.Getenv("REDIS_HOST"), os.Getenv("REDIS_PORT")),
		Password: os.Getenv("REDIS_PASS"), // kosongkan jika tidak ada
		DB:       0,
	})

	// test koneksi
	err := rdb.Ping(context.Background()).Err()
	if err != nil {
		panic(fmt.Sprintf("❌ Redis connection failed: %v", err))
	}

	fmt.Println("✅ Connected to Redis")
	RedisClient = rdb
	return rdb
}