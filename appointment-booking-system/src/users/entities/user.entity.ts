import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
@Unique(['email'])
export class User extends BaseEntity {
  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ length: 120 })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
  })
  role: Role;
  
}