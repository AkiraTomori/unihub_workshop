import AuthService from '../services/auth.service.js';

export class AuthController {
  /**
   * POST /auth/login
   * Login user and return access token
   */
  static async login(req, res) {
    try {
      const { email, password } = req.validatedData;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await AuthService.login(email, password, ipAddress);

      // Set refresh token as HttpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.status(200).json({
        status: 'SUCCESS',
        message: 'Login successful',
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * POST /auth/register
   * Register new user
   */
  static async register(req, res) {
    try {
      const { email, password, full_name, student_code } = req.validatedData;

      const result = await AuthService.register({
        email,
        password,
        full_name,
        student_code,
      });

      return res.status(201).json({
        status: 'SUCCESS',
        message: 'Registration successful',
        data: result,
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * GET /auth/me
   * Get current user profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await AuthService.getProfile(userId);

      return res.status(200).json({
        status: 'SUCCESS',
        message: 'User profile retrieved',
        data: user,
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  static async refresh(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;

      const result = await AuthService.refresh(refreshToken);

      return res.status(200).json({
        status: 'SUCCESS',
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      // Clear cookie on refresh failure
      res.clearCookie('refreshToken');

      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * POST /auth/logout
   * Logout user and revoke session
   */
  static async logout(req, res) {
    try {
      const userId = req.user?.id;
      const refreshToken = req.cookies.refreshToken;

      await AuthService.logout(userId, refreshToken);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      return res.status(200).json({
        status: 'SUCCESS',
        message: 'Logout successful',
      });
    } catch (error) {
      res.clearCookie('refreshToken');

      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message,
        code: error.code,
      });
    }
  }

  // /**
  //  * POST /auth/change-password
  //  * Change user password
  //  */
  // static async changePassword(req, res) {
  //   try {
  //     const userId = req.user.id;
  //     const { oldPassword, newPassword } = req.body;

  //     // Validate input
  //     if (!oldPassword || !newPassword) {
  //       return res.status(400).json({
  //         status: 'VALIDATION_ERROR',
  //         message: 'Old password and new password are required',
  //       });
  //     }

  //     if (newPassword.length < 6) {
  //       return res.status(400).json({
  //         status: 'VALIDATION_ERROR',
  //         message: 'New password must be at least 6 characters',
  //       });
  //     }

  //     const result = await AuthService.changePassword(userId, oldPassword, newPassword);

  //     // Clear refresh token cookie (force re-login)
  //     res.clearCookie('refreshToken');

  //     return res.status(200).json({
  //       status: 'SUCCESS',
  //       message: result.message,
  //     });
  //   } catch (error) {
  //     return res.status(error.status || 500).json({
  //       status: 'ERROR',
  //       message: error.message,
  //       code: error.code,
  //     });
  //   }
  // }
}

export default AuthController;
