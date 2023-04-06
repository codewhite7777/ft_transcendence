import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getUser() {
    return 'hello world';
  }

  @Post()
  updateUser() {
    return;
  }

  @Delete('/:id')
  async deleteUser(@Param('id') intraID: string) {
    const delResult = await this.userService.deleteUser(intraID);
    if (delResult == false)
      throw new NotFoundException(`${intraID} not found.`);
    return;
  }
}
