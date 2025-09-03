import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateMeetingRoomDto } from './dto/create-meeting-room.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting-room.dto';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { MeetingRoom } from './entities/meeting-room.entity';
import { EntityManager, Like, Repository } from 'typeorm';
import { Booking } from 'src/booking/entities/booking.entity';
import { MeetingRoomVo } from './vo/meeting-room.vo';

@Injectable()
export class MeetingRoomService {

  @InjectRepository(MeetingRoom)
  private repository: Repository<MeetingRoom>;

  @InjectEntityManager()
  private entityManager: EntityManager;

  initData() {
    const room1 = new MeetingRoom();
    room1.name = '木星';
    room1.capacity = 10;
    room1.equipment = '白板';
    room1.location = '一层西';

    const room2 = new MeetingRoom();
    room2.name = '金星';
    room2.capacity = 5;
    room2.equipment = '';
    room2.location = '二层东';

    const room3 = new MeetingRoom();
    room3.name = '天王星';
    room3.capacity = 30;
    room3.equipment = '白板，电视';
    room3.location = '三层东';

    this.repository.insert([room1, room2, room3]);
  }

  async find(pageNo: number, pageSize: number, name: string, capacity: number, equipment: string) {
    pageNo = Math.max(pageNo, 1);
    const skipCount = (pageNo - 1) * pageSize;
    const condition: Record<string, any> = {};
    if (name) {
      condition.name = Like(`%${name}%`);
    }
    if (equipment) {
      condition.equipment = Like(`%${equipment}%`);
    }
    if (capacity) {
      condition.capacity = capacity
    }
    const [meetingRooms, totalCount] = await this.repository.findAndCount({
      where: condition,
      skip: skipCount,
      take: pageSize
    });
    return {
      meetingRooms,
      totalCount
    };
  }

  async create(meetingRoomDto: CreateMeetingRoomDto) {
    const room = await this.repository.findOneBy({
      name: meetingRoomDto.name
    });
    if (room) {
      throw new BadRequestException('会议室名称已存在');
    }

    return await this.repository.save(meetingRoomDto);
  }

  async update(meetingRoomDto: UpdateMeetingRoomDto) {
    const meetingRoom: UpdateMeetingRoomDto | null = await this.repository.findOneBy({
      id: meetingRoomDto.id
    });
    if (!meetingRoom) {
      throw new BadRequestException('会议室不存在');
    }

    meetingRoom.capacity = meetingRoomDto.capacity;
    meetingRoom.location = meetingRoomDto.location;
    meetingRoom.name = meetingRoomDto.name;

    if (meetingRoomDto.description) {
      meetingRoom.description = meetingRoomDto.description;
    }
    if (meetingRoomDto.equipment) {
      meetingRoom.equipment = meetingRoomDto.equipment;
    }
 
    await this.repository.update({ id: meetingRoom.id }, meetingRoom);
    return 'success';
  }

  async findById(id: number) {
    const data = await this.repository.findOneBy({ id });
    if (!data) {
      throw new BadRequestException('该会议室不存在');
    }
    return new MeetingRoomVo(data);
  }

  async delete(id: number) {
    const bookings = await this.entityManager.findBy(Booking, {
      room: { id }
    });
    bookings.forEach(async(booking) => {
      await this.entityManager.delete(Booking, booking.id);
    });
    await this.repository.delete(id);
    return 'success'
  }
}
