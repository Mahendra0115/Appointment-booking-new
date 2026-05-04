import jwtConfig, { getRequiredJwtSecret } from './jwt.config';

describe('jwtConfig', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtExpiresIn = process.env.JWT_EXPIRES_IN;

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.JWT_EXPIRES_IN = originalJwtExpiresIn;
  });

  it('should throw when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;

    expect(() => getRequiredJwtSecret()).toThrow(
      'JWT_SECRET environment variable is required',
    );
  });

  it('should expose JWT config from environment', () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '2h';

    expect(jwtConfig()).toEqual({
      secret: 'test-secret',
      expiresIn: '2h',
    });
  });
});
