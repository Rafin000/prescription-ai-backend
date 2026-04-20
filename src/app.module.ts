import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ClsModule } from 'nestjs-cls';
import { validateEnv } from 'src/config/env.schema';
import { DatabaseModule } from 'src/modules/database/database.module';
import { LoggerModule } from 'src/modules/logger/logger.module';
import { HealthModule } from 'src/modules/health/health.module';
import { DoctorsModule } from 'src/modules/doctors/doctors.module';
import { ChambersModule } from 'src/modules/chambers/chambers.module';
import { AppointmentRequestsModule } from 'src/modules/appointment-requests/appointment-requests.module';
import { DemoBookingsModule } from 'src/modules/demo-bookings/demo-bookings.module';
import { SymptomSuggestModule } from 'src/modules/symptom-suggest/symptom-suggest.module';
import { UsersModule } from 'src/modules/users/users.module';
import { TeamsModule } from 'src/modules/teams/teams.module';
import { SubscriptionsModule } from 'src/modules/subscriptions/subscriptions.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { OnboardingModule } from 'src/modules/onboarding/onboarding.module';
import { PatientsModule } from 'src/modules/patients/patients.module';
import { AppointmentsModule } from 'src/modules/appointments/appointments.module';
import { ConsultsModule } from 'src/modules/consults/consults.module';
import { PrescriptionsModule } from 'src/modules/prescriptions/prescriptions.module';
import { VisitsModule } from 'src/modules/visits/visits.module';
import { InvoicesModule } from 'src/modules/invoices/invoices.module';
import { UsageModule } from 'src/modules/usage/usage.module';
import { BillingModule } from 'src/modules/billing/billing.module';
import { SslCommerzModule } from 'src/integrations/sslcommerz/sslcommerz.module';
import { VideoModule } from 'src/modules/video/video.module';
import { InvitesModule } from 'src/modules/invites/invites.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { AuditModule } from 'src/modules/audit/audit.module';
import { RetentionModule } from 'src/modules/retention/retention.module';
import { RedisModule } from 'src/modules/redis/redis.module';
import { OtpModule } from 'src/modules/otp/otp.module';
import { PoolClientInterceptor } from 'src/interceptors/pool-client.interceptor';
import { AuditInterceptor } from 'src/interceptors/audit.interceptor';
import { HttpExceptionFilter } from 'src/filters/http-exception.filter';
import { JwtGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { runMigrations } from 'src/scripts/migrate';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    LoggerModule,
    DatabaseModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '7d',
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    UsersModule,
    TeamsModule,
    SubscriptionsModule,
    HealthModule,
    DoctorsModule,
    ChambersModule,
    AppointmentRequestsModule,
    DemoBookingsModule,
    SymptomSuggestModule,
    AuthModule,
    OnboardingModule,
    PatientsModule,
    AppointmentsModule,
    ConsultsModule,
    PrescriptionsModule,
    VisitsModule,
    InvoicesModule,
    UsageModule,
    SslCommerzModule,
    BillingModule,
    VideoModule,
    NotificationsModule,
    InvitesModule,
    AuditModule,
    RetentionModule,
    RedisModule,
    OtpModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: PoolClientInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  private readonly log = new Logger(AppModule.name);

  constructor(private readonly config: ConfigService) {}

  async onApplicationBootstrap() {
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.log.log('Running pending migrations (dev)…');
      await runMigrations();
    }
  }
}
