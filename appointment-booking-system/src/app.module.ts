import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppointmentRemindersModule } from './appointment-reminders/appointment-reminders.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DoctorLeavesModule } from './doctor-leaves/doctor-leaves.module';
import { ClinicClosuresModule } from './clinic-closures/clinic-closures.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const synchronize =
          configService.get<string>('TYPEORM_SYNCHRONIZE') === undefined
            ? nodeEnv !== 'production'
            : configService.get<string>('TYPEORM_SYNCHRONIZE') === 'true';
        const useSsl =
          configService.get<string>('DB_SSL') === 'true' ||
          (nodeEnv === 'production' && Boolean(databaseUrl));
        const ssl = useSsl
          ? {
              rejectUnauthorized:
                configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !==
                'false',
            }
          : undefined;

        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize,
            ssl,
          };
        }

        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST'),
          port: Number(configService.get<string>('DB_PORT', '5432')),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize,
          ssl,
        };
      },
    }),
    UsersModule,
    AuthModule,
    DoctorsModule,
    AppointmentsModule,
    AppointmentRemindersModule,
    DoctorLeavesModule,
    ClinicClosuresModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})

export class AppModule {}
