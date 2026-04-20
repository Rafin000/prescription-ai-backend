import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';

export interface UserRow {
  id: string;
  email: string | null;
  password_hash: string | null;
  status: 'active' | 'disabled' | 'deleted';
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  data: UserData;
}

export interface UserData {
  name?: string;
  phone?: string;
  avatar_url?: string;
  locale?: string;
}

@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const client = await this.getClient();
    const r = await client.query<UserRow>(
      `SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    );
    return r.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const client = await this.getClient();
    const r = await client.query<UserRow>(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async create(input: {
    email: string;
    passwordHash: string;
    name: string;
    phone?: string;
    phoneVerified?: boolean;
  }): Promise<UserRow> {
    const client = await this.getClient();
    const r = await client.query<UserRow>(
      `INSERT INTO users
         (email, password_hash, status, phone_verified, phone_verified_at, data)
       VALUES ($1, $2, 'active', $3, CASE WHEN $3 THEN now() ELSE NULL END, $4::jsonb)
       RETURNING *`,
      [
        input.email.toLowerCase(),
        input.passwordHash,
        !!input.phoneVerified,
        JSON.stringify({ name: input.name, phone: input.phone ?? null }),
      ],
    );
    return r.rows[0];
  }

  async touchLogin(id: string): Promise<void> {
    const client = await this.getClient();
    await client.query(
      `UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1`,
      [id],
    );
  }
}
