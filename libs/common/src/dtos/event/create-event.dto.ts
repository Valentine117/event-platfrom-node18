export class CreateEventDto {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  conditions: Record<string, any>;
}
