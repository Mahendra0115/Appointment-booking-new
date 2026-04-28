import { Controller, Get } from '@nestjs/common';
import { ApiResponseDto } from './common/dto/api-response.dto';

@Controller()
export class AppController {
  @Get()
  getHello(): ApiResponseDto<any> {
    return new ApiResponseDto(
      true,
      'Appointment Booking API is ready',
      {
        endpoints: [
          '/api/health',
          '/api/doctors',
          '/api/doctors/:doctorId/availability',
          '/api/appointments',
        ],
      },
    );
  }
}
