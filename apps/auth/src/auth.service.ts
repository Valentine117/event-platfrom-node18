import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, RegisterDto, LoginDto } from '@lib/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userModel.findOne({ email: dto.email });
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    try {
      const hashed = await bcrypt.hash(dto.password, 10);
      const user = new this.userModel({ ...dto, password: hashed });
      await user.save();
      return { message: '가입 완료.' };
    } catch {
      throw new InternalServerErrorException(
        '회원가입 처리 중 오류가 발생했습니다.',
      );
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) {
      throw new UnauthorizedException('등록되지 않은 이메일입니다.');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('비밀번호를 다시 확인해주세요.');
    }

    try {
      const payload = {
        sub: user._id,
        email: user.email,
        role: user.role,
      };
      const token = await this.jwtService.signAsync(payload);
      return { accessToken: token };
    } catch {
      throw new InternalServerErrorException(
        '로그인 토큰 생성 중 오류가 발생했습니다.',
      );
    }
  }
}
