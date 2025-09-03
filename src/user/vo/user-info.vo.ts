import { ApiProperty } from "@nestjs/swagger";

export class UserDetailVo {

  constructor(partial?: Partial<UserDetailVo>) {
    Object.assign(this, partial);
  }

  @ApiProperty()
  id: number;
  @ApiProperty()
  username: string;
  @ApiProperty()
  nickName: string;
  @ApiProperty()
  email: string;
  @ApiProperty()
  headPic: string;
  @ApiProperty()
  phoneNumber: string;
  @ApiProperty()
  isFrozen: boolean;
  @ApiProperty()
  createTime: Date;  
}