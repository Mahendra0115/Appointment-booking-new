import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccessTestController } from './access-test.controller';

@Module({
  controllers: [AccessTestController],
  providers: [RolesGuard],
})
export class AccessTestModule {}