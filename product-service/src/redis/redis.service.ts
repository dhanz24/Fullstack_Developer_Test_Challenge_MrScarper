import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    });
    await this.client.connect();
    console.log('Redis connected');
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl = 60) {
    await this.client.set(key, value, { EX: ttl });
  }
}
