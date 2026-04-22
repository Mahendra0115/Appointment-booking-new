import { Role } from '../../common/enums/role.enum';

export class UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  
}