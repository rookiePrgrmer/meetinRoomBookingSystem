import { Controller, Get, Post, Body, Inject, Query, UnauthorizedException, ParseIntPipe, BadRequestException, DefaultValuePipe, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import path from 'path';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { EmailService } from 'src/email/email.service';
import { RedisService } from 'src/redis/redis.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RequireLogin, UserInfo } from 'src/custom.decorator';
import { UserDetailVo } from './vo/user-info.vo';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto'; 
import { UpdateUserDto } from './dto/update-user.dto';
import { generateParseIntPipe } from 'src/utils';
import { LoginUserVo } from './vo/login-user.vo';
import { RefreshTokenVo } from './vo/refresh-token.vo';
import { UserListVo } from './vo/user-list.vo';
import { FileInterceptor } from '@nestjs/platform-express';
import { storage } from 'src/my-file-storage';

@ApiTags('用户管理模块')
@Controller('user')
export class UserController {

  @Inject(EmailService)
  private emailService: EmailService;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(JwtService)
  private jwtService: JwtService;

  @Inject(ConfigService)
  private configService: ConfigService;

  constructor(private readonly userService: UserService) {}

  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }

  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '验证码已失效/验证码不正确/用户已存在'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '注册成功/失败',
    type: String
  })
  @Post('register')
  async create(@Body() registerUser: RegisterUserDto) {
    return await this.userService.register(registerUser);
  }

  @ApiQuery({
    name: 'address',
    type: String,
    description: '邮箱地址',
    required: true,
    example: 'xxx@xx.com'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '发送成功',
    type: String
  })
  @Get('register-captcha')
  async captcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);
    await this.redisService.set(`captcha_${address}`, code, 5 * 60);
    await this.emailService.sendMail({
      to: address,
      subject: '注册验证码',
      html: `<p>你的注册验证码是：${code}</p>`
    });
    return '发送成功';
  }

  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '用户不存在/密码错误',
    type: String
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '用户信息和token',
    type: LoginUserVo
  })
  @Post('login')
  async userLogin(@Body() loginUser: LoginUserDto) {
    const userVo = await this.userService.login(loginUser, false);
    userVo.accessToken = this.userService.genAccessToken(userVo.userInfo);
    userVo.refreshToken = this.userService.genRefreshToken(userVo.userInfo);
    return userVo;
  }

  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '用户不存在/密码错误',
    type: String
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '用户信息和token',
    type: LoginUserVo
  })
  @Post('admin/login')
  async adminLogin(@Body() loginUser: LoginUserDto) {
    const userVo = await this.userService.login(loginUser, true);
    userVo.accessToken = this.userService.genAccessToken(userVo.userInfo);
    userVo.refreshToken = this.userService.genRefreshToken(userVo.userInfo);
    return userVo;
  }

  @ApiQuery({
    name: 'refreshToken',
    type: String,
    description: '刷新token',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsInVzZXJuYW1lIjoibGlzaSIsInJvbGVzIjpbIuaZrumAmueUqOaItyJdLCJwZXJtaXNzaW9ucyI6W3siaWQiOjEsImNvZGUiOiJjY2MiLCJkZXNjcmlwdGlvbiI6Iuiuv-mXriBjY2Mg5o6l5Y-jIn1dLCJpYXQiOjE3NTYzMDA2OTgsImV4cCI6MTc1NjMwMjQ5OH0.DQdQfvRxiaH5E737QVP4SFpw2JBLmKMOikgQT9PtnvY'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'token已失效，请重新登陆'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '刷新成功',
    type: RefreshTokenVo
  })
  @Get('refresh')
  async refresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);
      const user = await this.userService.findUserById(data.userId, false);
      return this.userService.genToken(user);
    } catch(e) {
      throw new UnauthorizedException('token已失效， 请重新登录');
    }
  }

  @ApiQuery({
    name: 'refreshToken',
    type: String,
    description: '刷新token',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsInVzZXJuYW1lIjoibGlzaSIsInJvbGVzIjpbIuaZrumAmueUqOaItyJdLCJwZXJtaXNzaW9ucyI6W3siaWQiOjEsImNvZGUiOiJjY2MiLCJkZXNjcmlwdGlvbiI6Iuiuv-mXriBjY2Mg5o6l5Y-jIn1dLCJpYXQiOjE3NTYzMDA2OTgsImV4cCI6MTc1NjMwMjQ5OH0.DQdQfvRxiaH5E737QVP4SFpw2JBLmKMOikgQT9PtnvY'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'token已失效，请重新登陆'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '刷新成功',
    type: RefreshTokenVo
  })
  @Get('admin/refresh')
  async adminRefresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);
      const user = await this.userService.findUserById(data.userId, true);
      return this.userService.genToken(user);
    } catch(e) {
      console.log(e);
      throw new UnauthorizedException('token已失效， 请重新登录');
    }
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'success',
    type: UserDetailVo
  })
  @Get('info')
  @RequireLogin()
  async info(@UserInfo('userId') userId: number) {
    const user = await this.userService.findUserDetailById(userId);

    const userInfoVo = new UserDetailVo({
      id: user.id,
      email: user.email,
      username: user.username,
      headPic: user.headPic,
      phoneNumber: user.phoneNumber,
      nickName: user.nickName,
      createTime: user.createTime,
      isFrozen: user.isFrozen
    });

    return userInfoVo;
  }

  @ApiBody({
    type: UpdateUserPasswordDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: String,
    description: '验证码已失效/不正确'
  })
  @Post(['update_password', 'admin/update_password'])
  async updatePassword(@Body() updatePswDto: UpdateUserPasswordDto) {
    return await this.userService.updatePassword(updatePswDto);
  }

  @ApiQuery({
    name: 'address',
    description: '邮箱地址',
    type: String
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: String,
    description: '发送成功'
  })
  @Get('update_password/captcha')
  async updatePasswordCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);
    await this.redisService.set(`update_password_captcha_${address}`, code, 10 * 60);
    await this.emailService.sendMail({
      to: address,
      subject: '更改密码验证码',
      html: `<p>密码更改操作的验证码是：${code}</p>`
    });
    return '发送成功';
  }

  @ApiBearerAuth()
  @ApiBody({
    type: UpdateUserDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '验证码已失效/不正确'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: String
  })
  @Post(['update', 'admin/update'])
  @RequireLogin()
  async update(@UserInfo('userId') userId: number, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.update(userId, updateUserDto);
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    type: String,
    description: '发送成功'
  })
  @RequireLogin()
  @Get('update/captcha')
  async updateCaptcha(@UserInfo('email') address: string) {
    const code = Math.random().toString().slice(2, 8);
    await this.redisService.set(`update_user_captcha_${address}`, code, 10 * 60);
    await this.emailService.sendMail({
      to: address,
      subject: '更改用户信息验证码',
      html: `<p>用户信息更改操作的验证码是：${code}</p>`
    });
    return '发送成功';
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'id',
    description: '用户id',
    type: Number
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: String,
    description: 'success'
  })
  @RequireLogin()
  @Get('freeze')
  async freeze(@Query('id') userId: number) {
    await this.userService.freezeUserById(userId);
    return 'success';
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'pageNo',
    description: '页码',
    type: Number
  })
  @ApiQuery({
    name: 'pageSize',
    description: '每页数据条数',
    type: Number
  })
  @ApiQuery({
    name: 'username',
    description: '用户名',
    type: Number
  })
  @ApiQuery({
    name: 'nickName',
    description: '昵称',
    type: Number
  })
  @ApiQuery({
    name: 'email',
    description: '邮箱地址',
    type: String
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [UserListVo],
    description: '用户列表'
  })
  @RequireLogin()
  @Get('list')
  async list(
    @Query('pageNo', new DefaultValuePipe(1), generateParseIntPipe('pageNo类型为数字')) pageNo: number,
    @Query('pageSize', new DefaultValuePipe(2), generateParseIntPipe('pageSize类型为数字')) pageSize: number,
    @Query('username') username: string,
    @Query('nickName') nickName: string,
    @Query('email') email: string
  ) {
    return await this.userService.findUsers(
      pageNo,
      pageSize,
      username,
      nickName,
      email
    );
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    dest: 'uploads',
    storage,
    fileFilter(req, file, cb) {
      const ext = path.extname(file.originalname);
      if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext.toLowerCase())) {
        cb(null, true);
      } else {
        cb(new BadRequestException('只能上传图片'), false);
      }
    },
    limits: {
      fileSize: 1024 * 1024 * 3
    }
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log('file', file);
    return file.path;
  }
}
