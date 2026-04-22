import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiResponseDto } from './common/dto/api-response.dto';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API metadata', () => {
      expect(appController.getHello()).toEqual(
        new ApiResponseDto(true, 'Appointment Booking API is ready', {
          endpoints: [
            '/api/health',
            '/api/doctors',
            '/api/doctors/:doctorId/availability',
            '/api/appointments',
          ],
        }),
      );
    });
  });
});
