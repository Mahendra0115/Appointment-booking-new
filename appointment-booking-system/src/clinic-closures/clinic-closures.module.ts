import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClinicClosuresController } from './clinic-closures.controller';
import { ClinicClosuresService } from './clinic-closures.service';
import { ClinicClosure } from './entities/clinic-closure.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicClosure])],
  controllers: [ClinicClosuresController],
  providers: [ClinicClosuresService],
})
export class ClinicClosuresModule {}
