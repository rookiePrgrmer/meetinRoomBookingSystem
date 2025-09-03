import { Controller, Get, Post, Body, Patch, Param, Delete, Query, DefaultValuePipe, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { generateParseIntPipe } from 'src/utils';
import { RequireLogin, UserInfo } from 'src/custom.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('预定模块')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('list')
  async list(
    @Query('pageNo', new DefaultValuePipe(1), generateParseIntPipe('pageNo类型为数字')) pageNo: number,
    @Query('pageSize', new DefaultValuePipe(10), generateParseIntPipe('pageSize类型为数字')) pageSize: number,
    @Query('username') username: string,
    @Query('roomName') roomName: string,
    @Query('roomPosition') roomPosition: string,
    @Query('startTime') startTime: number,
    @Query('endTime') endTime: number
  ) {
    return this.bookingService.find(pageNo, pageSize, username, roomName, roomPosition, startTime, endTime);
  }

  @Post('add')
  @RequireLogin()
  async add(@Body() booking: CreateBookingDto, @UserInfo('userId') userId: number) {
    await this.bookingService.add(booking, userId);
    return 'success';
  }

  @Get('apply/:id')
  async apply(@Param('id') id: number) {
    return await this.bookingService.apply(id);
  }
  @Get('reject/:id')
  async reject(@Param('id') id: number) {
    return await this.bookingService.reject(id);
  }
  @Get('unbind/:id')
  async unbind(@Param('id') id: number) {
    return await this.bookingService.unbind(id);
  }

  @Get('urge/:id')
  async urge(@Param('id') id: number) {
    return await this.bookingService.urge(id);
  }
}
