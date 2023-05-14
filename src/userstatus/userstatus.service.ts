import { Injectable } from '@nestjs/common';
import { UserStatus } from './userstatus.interface';

@Injectable()
export class UserstatusService {
  private userStatusMap: Map<number, UserStatus>;

  constructor() {
    this.userStatusMap = new Map();
  }

  setUserStatus(userId: number, status: UserStatus): void {
    this.userStatusMap.set(userId, status);
  }

  getUserStatus(userId: number): UserStatus {
    return this.userStatusMap.get(userId);
  }

  getUserStatusMap(): Map<number, UserStatus> {
    return this.userStatusMap;
  }
}
