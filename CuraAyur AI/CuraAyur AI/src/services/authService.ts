import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { config } from '../config/unifiedConfig';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async signup(data: any) {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      const error: any = new Error('Email already in use');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const user = await this.userRepository.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });

    const token = this.generateToken(user.id);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  }

  async login(data: any) {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken(user.id);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  }

  private generateToken(userId: string): string {
    return jwt.sign({ id: userId }, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn as any,
    });
  }
}
