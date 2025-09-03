import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength } from "class-validator";
import { MinLengthIfNotEmpty } from "src/custom.decorator";

export class CreateMeetingRoomDto {
  @ApiProperty()
  @IsNotEmpty({ message: '会议室名称不能为空' })
  @MaxLength(10, { message: '会议室名称最长为10字符' })
  name: string;

  @ApiProperty()
  @IsNotEmpty({ message: '容量不能为空' })
  capacity: number;

  @ApiProperty()
  @IsNotEmpty({ message: '位置不能为空' })
  @MaxLength(50, { message: '位置最长为50字符' })
  location: string;

  @ApiProperty()
  @MinLengthIfNotEmpty(50, { message: '设备最长为50字符' })
  equipment: string;

  @ApiProperty()
  @MinLengthIfNotEmpty(100, { message: '描述最长为100字符' })
  description: string;
}
