import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, LessThanOrEqual, Like, MoreThanOrEqual } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { MeetingRoom } from 'src/meeting-room/entities/meeting-room.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class BookingService {

  @InjectEntityManager()
  private entityManager: EntityManager;

  @Inject()
  private redisService: RedisService;

  @Inject()
  private emailService: EmailService;

  async initData() {
    const user1 = await this.entityManager.findOneBy(User, { id: 3 });
    const user2 = await this.entityManager.findOneBy(User, { id: 4 });
    const room1 = await this.entityManager.findOneBy(MeetingRoom, { id: 6 });
    const room2 = await this.entityManager.findOneBy(MeetingRoom, { id: 7 });

    const booking1 = new Booking();
    if (room1 && user1) {
      booking1.room = room1;
      booking1.user = user1;
    }
    booking1.startTime = new Date();
    booking1.endTime = new Date(Date.now() + 1000 * 60 * 60);
    await this.entityManager.save(Booking, booking1);

    const booking2 = new Booking();
    if (room2 && user2) {
      booking2.room = room2;
      booking2.user = user2;
    }
    booking2.startTime = new Date();
    booking2.endTime = new Date(Date.now() + 1000 * 60 * 60);
    await this.entityManager.save(Booking, booking2);
  
    const booking3 = new Booking();
    if (room1 && user2) {
      booking3.room = room1;
      booking3.user = user2;
    }
    booking3.startTime = new Date();
    booking3.endTime = new Date(Date.now() + 1000 * 60 * 60);
    await this.entityManager.save(Booking, booking3);
  
    const booking4 = new Booking();
    if (room2 && user1) {
      booking4.room = room2;
      booking4.user = user1;
    }
    booking4.startTime = new Date();
    booking4.endTime = new Date(Date.now() + 1000 * 60 * 60);
    await this.entityManager.save(Booking, booking4);  
  }

  async find(
    pageNo: number, pageSize: number, username: string, roomName: string, roomPosition: string, startTime: number, endTime: number
  ) {
    pageNo = Math.max(pageNo, 1);
    const skipCount = (pageNo - 1) * pageSize;
    const condition: Record<string, any> = {};
    if (username) {
      condition.user = { username: Like(`%${username}%`) }
    }
    if (roomName) {
      condition.room = { ...(condition.room || {}), name: Like(`%${roomName}%`) };
    }
    if (roomPosition) {
      condition.room = { ...(condition.room || {}), location: Like(`%${roomPosition}%`) };
    }
    if (startTime && endTime) {
      condition.startTime = Between(new Date(+startTime), new Date(+endTime));
    }
    const [bookings, totalCount] = await this.entityManager.findAndCount(Booking, {
      where: condition,
      relations: {
        user: true,
        room: true
      },
      skip: skipCount,
      take: pageSize
    });

    return {
      bookings: bookings.map(booking => {
        delete booking.user?.password;
        return booking;
      }),
      totalCount
    };
  }

  async add(bookingDto: CreateBookingDto, userId: number) {
    const meetingRoom = await this.entityManager.findOneBy(MeetingRoom, {
      id: bookingDto.meetingRoomId
    });
    if (!meetingRoom) {
      throw new BadRequestException('会议室不存在');
    }

    const user = await this.entityManager.findOneBy(User, {
      id: userId
    });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    const booking = new Booking();
    booking.room = meetingRoom;
    booking.user = user;
    booking.startTime = new Date(bookingDto.startTime);
    booking.endTime = new Date(bookingDto.endTime);
    if (bookingDto.note) { 
      booking.note = bookingDto.note;
    }

    const overlapedBooking = await this.entityManager.findOneBy(Booking, {
      room: { id: meetingRoom.id },
      startTime: LessThanOrEqual(booking.startTime),
      endTime: MoreThanOrEqual(booking.endTime)
    });
    console.log(overlapedBooking);
    if (overlapedBooking) {
      throw new BadRequestException('该时段已被预订');
    }

    await this.entityManager.save(Booking, booking);
  }

  async apply(id: number) {
    await this.entityManager.update(
      Booking,
      { id },
      { status: BookingStatus.PASS }
    );
    return 'success';
  }
  async reject(id: number) {
    await this.entityManager.update(
      Booking,
      { id },
      { status: BookingStatus.REJECT }
    );
    return 'success';
  }
  async unbind(id: number) {
    await this.entityManager.update(
      Booking,
      { id },
      { status: BookingStatus.UNBIND }
    );
    return 'success';
  }

  async getAdminEmail() {
    let email = await this.redisService.get('admin_email');
    if (!email) {
      const admin = await this.entityManager.findOne(User, {
        select: { email: true },
        where: { isAdmin: true },
      });
      if (admin) {
        email = admin.email;
        this.redisService.set('admin_email', email);
      }
    }
    return email;
  }
  async urge(id: number) {
    const flag = await this.redisService.get(`booking_urge_${id}`);
    if (flag) {
      return '半小时内只能催办一次，请耐心等待';
    }

    const adminEmail = await this.getAdminEmail();
    await this.redisService.set(`booking_urge_${id}`, 1, 60 * 30);
    
    this.emailService.sendMail({
      to: adminEmail,
      subject: '预定会议室申请催办通知',
      html: `id为${id}的会议室预定申请正在等待审批，请尽快操作，谢谢`
    });
  }
}
