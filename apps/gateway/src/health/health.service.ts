import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisClientType } from 'redis';
import axios from 'axios';

@Injectable()
export class HealthService {
  constructor(
    private readonly httpService: HttpService,
    @InjectConnection() private readonly mongoConnection: Connection,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  async getHealthStatus() {
    const authUrl = process.env.AUTH_SERVICE_URL;
    const eventUrl = process.env.EVENT_SERVICE_URL;

    const results: Record<string, any> = {
      gateway: { status: 'ok' },
    };

    // MongoDB
    const mongoStart = Date.now();
    try {
      if (this.mongoConnection.readyState === 1) {
        results.mongo = {
          status: 'ok',
          durationMs: Date.now() - mongoStart,
        };
      } else {
        throw new Error('Mongo not connected');
      }
    } catch (err) {
      results.mongo = {
        status: 'fail',
        durationMs: Date.now() - mongoStart,
        error: err.message,
      };
    }

    // Redis
    const redisStart = Date.now();
    try {
      await this.redisClient.ping();
      results.redis = {
        status: 'ok',
        durationMs: Date.now() - redisStart,
      };
    } catch (err) {
      results.redis = {
        status: 'fail',
        durationMs: Date.now() - redisStart,
        error: err.message,
      };
    }

    // RabbitMQ (단순 socket 연결 확인)
    const rabbitStart = Date.now();
    try {
      const net = require('net');
      await new Promise((resolve, reject) => {
        const socket = net.createConnection({ port: 5672, host: 'rabbitmq' });
        socket.on('connect', () => {
          socket.end();
          resolve(true);
        });
        socket.on('error', reject);
      });
      results.rabbitmq = {
        status: 'ok',
        durationMs: Date.now() - rabbitStart,
      };
    } catch (err) {
      results.rabbitmq = {
        status: 'fail',
        durationMs: Date.now() - rabbitStart,
        error: err.message,
      };
    }

    // Auth 서비스
    const authStart = Date.now();
    try {
      const authRes = await axios.get(`${authUrl}/health`);
      results.auth = {
        status: authRes.status === 200 ? 'ok' : 'fail',
        durationMs: Date.now() - authStart,
      };
    } catch (err) {
      results.auth = {
        status: 'fail',
        durationMs: Date.now() - authStart,
        error: err.message,
      };
    }

    // Event 서비스
    const eventStart = Date.now();
    try {
      const eventRes = await axios.get(`${eventUrl}/health`);
      results.event = {
        status: eventRes.status === 200 ? 'ok' : 'fail',
        durationMs: Date.now() - eventStart,
      };
    } catch (err) {
      results.event = {
        status: 'fail',
        durationMs: Date.now() - eventStart,
        error: err.message,
      };
    }

    return results;
  }
}
