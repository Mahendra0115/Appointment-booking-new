import { registerAs } from '@nestjs/config';

export const getRequiredJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return secret;
};

export default registerAs('jwt', () => ({
  secret: getRequiredJwtSecret(),
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
}));
