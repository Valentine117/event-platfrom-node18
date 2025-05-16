import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '@lib/common/common.module';

@Module({
  imports: [MongooseModule.forRoot(process.env.MONGO_URI), CommonModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
