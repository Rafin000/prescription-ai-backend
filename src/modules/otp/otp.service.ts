import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { RedisService } from 'src/modules/redis/redis.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { parseBdPhone } from 'src/shared/utils/bd-phone';

const CODE_TTL_SEC = 5 * 60;             // 5 minutes
const RATE_WINDOW_SEC = 15 * 60;         // 15 minutes
const RATE_MAX = 3;                       // per phone per window
const TOKEN_TTL = '10m';                  // verification token validity

@Injectable()
export class OtpService {
  private readonly log = new Logger(OtpService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly notifs: NotificationsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async request(rawPhone: string): Promise<{ phone: string; expiresAt: string }> {
    const phone = this.normalise(rawPhone);

    // Per-phone rate limit
    const rateKey = `otp:rate:${phone}`;
    const used = Number((await this.redis.client.get(rateKey)) ?? 0);
    if (used >= RATE_MAX) {
      throw new HttpException(
        'Too many OTP requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);

    // Store hash (not code) with expiry
    await this.redis.client.set(`otp:code:${phone}`, codeHash, 'EX', CODE_TTL_SEC);
    // Bump rate counter (only on first use set expiry)
    const pipe = this.redis.client.multi();
    pipe.incr(rateKey);
    pipe.expire(rateKey, RATE_WINDOW_SEC, 'NX' as never);
    await pipe.exec();

    await this.notifs.safeSendSms({
      teamId: '00000000-0000-0000-0000-000000000000',
      kind: 'otp.code',
      to: phone,
      body: `Prescription AI: Your code is ${code}. Expires in 5 minutes. Don't share with anyone.`,
      dedupeKey: `otp-${phone}-${Date.now()}`,
    });

    // Dev convenience: also log the code so developers can test without a real SMS provider.
    if ((process.env.NODE_ENV ?? 'development') !== 'production') {
      this.log.log(`[dev] OTP for ${phone} = ${code}`);
    }

    return {
      phone,
      expiresAt: new Date(Date.now() + CODE_TTL_SEC * 1000).toISOString(),
    };
  }

  async verify(rawPhone: string, code: string): Promise<{ phone: string; token: string }> {
    const phone = this.normalise(rawPhone);
    const key = `otp:code:${phone}`;
    const hash = await this.redis.client.get(key);
    if (!hash) throw new BadRequestException('Code expired or never requested');

    const ok = await bcrypt.compare(code, hash);
    if (!ok) {
      // Increment attempts; lock after 5 bad tries to deter brute force.
      const attempts = await this.redis.client.incr(`otp:attempts:${phone}`);
      await this.redis.client.expire(`otp:attempts:${phone}`, CODE_TTL_SEC);
      if (attempts >= 5) {
        await this.redis.client.del(key);
        throw new BadRequestException('Too many bad attempts. Request a new code.');
      }
      throw new BadRequestException('Incorrect code');
    }

    await this.redis.client.del(key);
    await this.redis.client.del(`otp:attempts:${phone}`);

    const token = this.jwt.sign(
      { sub: phone, scope: 'phone-verified' },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: TOKEN_TTL,
      },
    );
    return { phone, token };
  }

  /** Decode a previously-issued phone-verified token. Returns null if invalid. */
  verifyToken(token: string): { phone: string } | null {
    try {
      const payload = this.jwt.verify<{ sub: string; scope: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      if (payload.scope !== 'phone-verified') return null;
      return { phone: payload.sub };
    } catch {
      return null;
    }
  }

  private normalise(raw: string): string {
    const parsed = parseBdPhone(raw);
    if (!parsed) throw new BadRequestException('Not a valid Bangladesh mobile number');
    return parsed.e164;
  }
}
