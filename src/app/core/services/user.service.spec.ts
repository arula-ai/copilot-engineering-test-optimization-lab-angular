import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  // REDUNDANT: This setup is duplicated instead of using beforeEach properly
  function setupService() {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    setupService();
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('isValidEmail', () => {
    // REDUNDANT: These tests should use test.each for parameterization
    // Instead, each email is tested individually with duplicate assertions

    it('should validate test@example.com as valid', () => {
      // Redundant setup
      const email = 'test@example.com';
      const result = service.isValidEmail(email);
      expect(result).toBe(true);
    });

    it('should validate user.name@domain.org as valid', () => {
      // Redundant setup
      const email = 'user.name@domain.org';
      const result = service.isValidEmail(email);
      expect(result).toBe(true);
    });

    it('should validate a+b@test.co as valid', () => {
      // Redundant setup
      const email = 'a+b@test.co';
      const result = service.isValidEmail(email);
      expect(result).toBe(true);
    });

    it('should validate invalid email without @ as invalid', () => {
      // Redundant setup
      const email = 'invalidemail';
      const result = service.isValidEmail(email);
      expect(result).toBe(false);
    });

    it('should validate email without domain as invalid', () => {
      // Redundant setup
      const email = 'test@';
      const result = service.isValidEmail(email);
      expect(result).toBe(false);
    });

    it('should validate email without local part as invalid', () => {
      // Redundant setup
      const email = '@domain.com';
      const result = service.isValidEmail(email);
      expect(result).toBe(false);
    });

    // THESE SHOULD BE PARAMETERIZED LIKE:
    // test.each([
    //   ['test@example.com', true],
    //   ['user.name@domain.org', true],
    //   ['invalidemail', false],
    //   ['test@', false],
    //   ['@domain.com', false],
    // ])('should validate %s as %s', (email, expected) => {
    //   expect(service.isValidEmail(email)).toBe(expected);
    // });
  });

  describe('validatePassword', () => {
    // REDUNDANT: Same issue - should use test.each

    it('should reject password shorter than 8 characters', () => {
      const result = service.validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = service.validatePassword('lowercase1!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    it('should reject password without lowercase', () => {
      const result = service.validatePassword('UPPERCASE1!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject password without number', () => {
      const result = service.validatePassword('NoNumber!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should reject password without special character', () => {
      const result = service.validatePassword('NoSpecial1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('special');
    });

    it('should accept valid password', () => {
      const result = service.validatePassword('ValidPass1!');
      expect(result.valid).toBe(true);
    });
  });

  describe('isValidPhone', () => {
    // REDUNDANT: Again, should use parameterized tests

    it('should validate 10 digit phone as valid', () => {
      expect(service.isValidPhone('1234567890')).toBe(true);
    });

    it('should validate phone with dashes as valid', () => {
      expect(service.isValidPhone('123-456-7890')).toBe(true);
    });

    it('should validate phone with country code as valid', () => {
      expect(service.isValidPhone('+1 234 567 8900')).toBe(true);
    });

    it('should validate short phone as invalid', () => {
      expect(service.isValidPhone('12345')).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', (done) => {
      const mockResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          status: 'active',
          preferences: { newsletter: false, notifications: true, language: 'en', currency: 'USD' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        token: 'mock-token',
        expiresAt: new Date(Date.now() + 3600000)
      };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe({
        next: (response) => {
          expect(response.user.email).toBe('test@example.com');
          expect(response.token).toBe('mock-token');
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/login');
      req.flush(mockResponse);
    });

    // MISSING TESTS:
    // - Login with invalid email format
    // - Login with empty password
    // - Login with wrong credentials (401)
    // - Login with network error
    // - Login with server error (500)
    // - Verify token is stored in localStorage
    // - Verify currentUser signal is updated
  });

  describe('register', () => {
    it('should register successfully', (done) => {
      const mockResponse = {
        user: {
          id: 'new-user-1',
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
          status: 'active',
          preferences: { newsletter: false, notifications: true, language: 'en', currency: 'USD' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        token: 'new-token',
        expiresAt: new Date(Date.now() + 3600000)
      };

      service.register({
        email: 'new@example.com',
        password: 'ValidPass1!',
        firstName: 'New',
        lastName: 'User'
      }).subscribe({
        next: (response) => {
          expect(response.user.email).toBe('new@example.com');
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/register');
      req.flush(mockResponse);
    });

    // MISSING TESTS:
    // - Register with invalid email
    // - Register with weak password
    // - Register with short first name
    // - Register with short last name
    // - Register with duplicate email (409)
    // - Register with network error
  });

  // MISSING TEST SECTIONS:
  // - logout
  // - getUser
  // - updateProfile
  // - changePassword
  // - requestPasswordReset
  // - deactivateAccount
  // - updateUserStatus
  // - getDisplayName
  // - getToken
  // - Signal state management
});
