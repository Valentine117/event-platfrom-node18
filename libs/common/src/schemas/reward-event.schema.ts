import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RewardEventDocument = RewardEvent & Document;

export enum EventStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Schema({ timestamps: true })
export class RewardEvent {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: EventStatus, default: EventStatus.INACTIVE })
  status: EventStatus;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true, type: Object })
  conditions: Record<string, any>;
}

export const RewardEventSchema = SchemaFactory.createForClass(RewardEvent);

// rewards virtual 필드 추가
RewardEventSchema.virtual('rewards', {
  ref: 'Reward', // 참조할 모델 이름
  localField: '_id', // RewardEvent의 _id
  foreignField: 'eventId', // Reward의 eventId
});

// JSON으로 응답 시 virtual 포함되도록 설정
RewardEventSchema.set('toObject', { virtuals: true });
RewardEventSchema.set('toJSON', { virtuals: true });
