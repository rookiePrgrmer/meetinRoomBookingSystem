import { Get, Controller, Inject, Query, HttpStatus } from '@nestjs/common';
import { StatisticService } from './statistic.service';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserBookingCount } from './vo/UserBookingCount.vo';
import { MeetingRoomUsedCount } from './vo/MeetingRoomUsedCount.vo';

@ApiTags('统计管理模块')
@Controller('statistic')
export class StatisticController {

  @Inject()
  private statisticService: StatisticService;

  @ApiBearerAuth()
  @ApiQuery({
    name: 'startTime',
    type: String,
    description: '开始时间'
  })
  @ApiQuery({
    name: 'endTime',
    type: String,
    description: '结束时间'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [UserBookingCount]
  })
  @Get('userBookingCount')
  async userBookingCount(@Query('startTime') startTime: string, @Query('endTime') endTime) {
    return await this.statisticService.userBookingCount(startTime, endTime);
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'startTime',
    type: String,
    description: '开始时间'
  })
  @ApiQuery({
    name: 'endTime',
    type: String,
    description: '结束时间'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [MeetingRoomUsedCount]
  })
  @Get('meetingRoomUsedCount')
  async meetingRoomUsedCount(@Query('startTime') startTime, @Query('endTime') endTime) {
    return await this.statisticService.meetingRoomUsedCount(startTime, endTime);
  }
}
