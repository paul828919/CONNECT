/**
 * Unit Tests for Naver OAuth Provider
 *
 * Tests the Naver OAuth configuration and profile mapping
 */

// Mock NextAuth to avoid ESM import issues
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@next-auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

describe('Naver OAuth Provider', () => {
  let naverProvider: any;

  beforeAll(async () => {
    // Dynamically import the authOptions after mocking dependencies
    const { authOptions } = await import('@/lib/auth.config');
    // Find the Naver provider in the authOptions
    naverProvider = authOptions.providers.find((p: any) => p.id === 'naver');
  });

  describe('Provider Configuration', () => {
    it('should have Naver provider configured', () => {
      expect(naverProvider).toBeDefined();
      expect(naverProvider.id).toBe('naver');
      expect(naverProvider.name).toBe('Naver');
      expect(naverProvider.type).toBe('oauth');
    });

    it('should have correct client credentials from environment', () => {
      expect(naverProvider.clientId).toBeDefined();
      expect(naverProvider.clientSecret).toBeDefined();
    });

    it('should have correct authorization URL', () => {
      expect(naverProvider.authorization.url).toBe('https://nid.naver.com/oauth2.0/authorize');
      expect(naverProvider.authorization.params.response_type).toBe('code');
    });

    it('should have correct token URL', () => {
      expect(naverProvider.token.url).toBe('https://nid.naver.com/oauth2.0/token');
    });

    it('should have correct userinfo URL', () => {
      expect(naverProvider.userinfo.url).toBe('https://openapi.naver.com/v1/nid/me');
    });
  });

  describe('Profile Mapping', () => {
    it('should map Naver profile with all fields', () => {
      const naverProfileResponse = {
        response: {
          id: 'naver123456',
          name: '김철수',
          nickname: 'chulsoo',
          email: 'chulsoo@naver.com',
          profile_image: 'https://ssl.pstatic.net/static/pwe/address/img_profile.png',
        },
      };

      const mappedProfile = naverProvider.profile(naverProfileResponse);

      expect(mappedProfile.id).toBe('naver123456');
      expect(mappedProfile.name).toBe('김철수');
      expect(mappedProfile.email).toBe('chulsoo@naver.com');
      expect(mappedProfile.image).toBe('https://ssl.pstatic.net/static/pwe/address/img_profile.png');
    });

    it('should use nickname when name is not available', () => {
      const naverProfileResponse = {
        response: {
          id: 'naver123456',
          nickname: 'chulsoo',
          email: 'chulsoo@naver.com',
        },
      };

      const mappedProfile = naverProvider.profile(naverProfileResponse);

      expect(mappedProfile.id).toBe('naver123456');
      expect(mappedProfile.name).toBe('chulsoo');
      expect(mappedProfile.email).toBe('chulsoo@naver.com');
      expect(mappedProfile.image).toBeNull();
    });

    it('should use "Unknown" when both name and nickname are missing', () => {
      const naverProfileResponse = {
        response: {
          id: 'naver123456',
          email: 'chulsoo@naver.com',
        },
      };

      const mappedProfile = naverProvider.profile(naverProfileResponse);

      expect(mappedProfile.name).toBe('Unknown');
    });

    it('should handle missing email', () => {
      const naverProfileResponse = {
        response: {
          id: 'naver123456',
          name: '김철수',
        },
      };

      const mappedProfile = naverProvider.profile(naverProfileResponse);

      expect(mappedProfile.id).toBe('naver123456');
      expect(mappedProfile.name).toBe('김철수');
      expect(mappedProfile.email).toBeNull();
      expect(mappedProfile.image).toBeNull();
    });

    it('should handle profile with Korean characters', () => {
      const naverProfileResponse = {
        response: {
          id: '네이버사용자123',
          name: '이영희',
          nickname: '영희짱',
          email: 'younghee@naver.com',
        },
      };

      const mappedProfile = naverProvider.profile(naverProfileResponse);

      expect(mappedProfile.id).toBe('네이버사용자123');
      expect(mappedProfile.name).toBe('이영희');
    });
  });

  describe('Token Exchange', () => {
    it('should have token request function', () => {
      expect(naverProvider.token.request).toBeDefined();
      expect(typeof naverProvider.token.request).toBe('function');
    });

    it('should format token request correctly', async () => {
      // Mock fetch for this test
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              access_token: 'mock_access_token',
              refresh_token: 'mock_refresh_token',
              token_type: 'bearer',
              expires_in: 3600,
            }),
        })
      ) as jest.Mock;

      const mockContext = {
        provider: {
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret',
        },
        params: {
          code: 'test_auth_code',
          state: 'test_state',
        },
      };

      await naverProvider.token.request(mockContext);

      expect(fetch).toHaveBeenCalledWith(
        'https://nid.naver.com/oauth2.0/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      // Check that the body contains required parameters
      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const bodyString = fetchCall[1].body;
      expect(bodyString).toContain('grant_type=authorization_code');
      expect(bodyString).toContain('client_id=test_client_id');
      expect(bodyString).toContain('client_secret=test_client_secret');
      expect(bodyString).toContain('code=test_auth_code');
      expect(bodyString).toContain('state=test_state');
    });
  });

  describe('Userinfo Request', () => {
    it('should have userinfo request function', () => {
      expect(naverProvider.userinfo.request).toBeDefined();
      expect(typeof naverProvider.userinfo.request).toBe('function');
    });

    it('should format userinfo request with bearer token', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              response: {
                id: 'naver123',
                name: '테스트',
                email: 'test@naver.com',
              },
            }),
        })
      ) as jest.Mock;

      await naverProvider.userinfo.request({ tokens: { access_token: 'mock_token' } });

      expect(fetch).toHaveBeenCalledWith(
        'https://openapi.naver.com/v1/nid/me',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer mock_token',
          },
        })
      );
    });
  });

  describe('Integration with NextAuth', () => {
    it('should be registered in authOptions providers array', async () => {
      const { authOptions } = await import('@/lib/auth.config');
      const providerIds = authOptions.providers.map((p: any) => p.id);
      expect(providerIds).toContain('naver');
      expect(providerIds).toContain('kakao'); // Ensure Kakao is still there
    });

    it('should use same session strategy as other providers', async () => {
      const { authOptions } = await import('@/lib/auth.config');
      expect(authOptions.session?.strategy).toBe('jwt');
      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
    });

    it('should have correct page configurations', async () => {
      const { authOptions } = await import('@/lib/auth.config');
      expect(authOptions.pages?.signIn).toBe('/auth/signin');
      expect(authOptions.pages?.error).toBe('/auth/error');
      expect(authOptions.pages?.newUser).toBe('/auth/welcome');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during token exchange', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock;

      const mockContext = {
        provider: {
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret',
        },
        params: {
          code: 'test_auth_code',
          state: 'test_state',
        },
      };

      await expect(naverProvider.token.request(mockContext)).rejects.toThrow('Network error');
    });

    it('should handle network errors during userinfo request', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock;

      await expect(
        naverProvider.userinfo.request({ tokens: { access_token: 'mock_token' } })
      ).rejects.toThrow('Network error');
    });
  });
});

describe('Kakao OAuth Provider (Regression Test)', () => {
  // Ensure Kakao OAuth still works after adding Naver
  let kakaoProvider: any;

  beforeAll(async () => {
    const { authOptions } = await import('@/lib/auth.config');
    kakaoProvider = authOptions.providers.find((p: any) => p.id === 'kakao');
  });

  it('should still have Kakao provider configured', () => {
    expect(kakaoProvider).toBeDefined();
    expect(kakaoProvider.id).toBe('kakao');
    expect(kakaoProvider.name).toBe('Kakao');
    expect(kakaoProvider.type).toBe('oauth');
  });

  it('should have correct Kakao authorization URL', () => {
    expect(kakaoProvider.authorization.url).toBe('https://kauth.kakao.com/oauth/authorize');
  });

  it('should have correct Kakao token URL', () => {
    expect(kakaoProvider.token.url).toBe('https://kauth.kakao.com/oauth/token');
  });

  it('should have correct Kakao userinfo URL', () => {
    expect(kakaoProvider.userinfo.url).toBe('https://kapi.kakao.com/v2/user/me');
  });
});
