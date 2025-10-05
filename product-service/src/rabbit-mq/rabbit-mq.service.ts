import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private channel: amqp.Channel;
  private isReady = false;

  async onModuleInit() {
    await this.connect();
  }

  private async connect(retries = 5, delay = 5000) {
    while (retries) {
      try {
        const conn = await amqp.connect(process.env.RABBITMQ_URL || 'RABBITMQ_URL not set');
        this.channel = await conn.createChannel();
        await this.channel.assertExchange('events', 'topic', { durable: true });

        this.isReady = true;
        console.log('✅ RabbitMQ connected');
        return;
      } catch (err) {
        console.error('❌ RabbitMQ connection failed:', err.message);
        retries -= 1;
        if (retries === 0) throw err;
        console.log(`🔄 Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  private async waitForReady() {
    while (!this.isReady) {
      console.log('⏳ Waiting for RabbitMQ...');
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  async subscribe(event: string, handler: (msg: any) => void) {
    await this.waitForReady();
    const q = await this.channel.assertQueue('', { exclusive: true });
    await this.channel.bindQueue(q.queue, 'events', event);
    this.channel.consume(q.queue, (msg) => {
      if (msg) {
        const data = JSON.parse(msg.content.toString());
        handler(data);
      }
    });
    console.log(`👂 Subscribed to event: ${event}`);
  }

  async publish(event: string, payload: any) {
    await this.waitForReady();
    this.channel.publish('events', event, Buffer.from(JSON.stringify(payload)));
    console.log(`📤 Event published: ${event}`);
  }
}
