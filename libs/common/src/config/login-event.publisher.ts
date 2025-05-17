import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

@Injectable()
export class LoginEventPublisher implements OnModuleInit {
  private client: ClientProxy;

  onModuleInit() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://guest:guest@rabbitmq:5672'],
        queue: 'user.logged_in',
        queueOptions: { durable: true },
      },
    });
  }

  async publishLoginEvent(userId: string) {
    await this.client.emit('user.logged_in', { userId }).toPromise();
  }
}
