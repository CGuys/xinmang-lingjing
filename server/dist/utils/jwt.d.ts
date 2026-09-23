export interface UserJwtPayload {
    userId: string;
    openid: string;
}
export interface AdminJwtPayload {
    adminId: string;
    username: string;
    role: string;
}
export declare function signUserToken(payload: UserJwtPayload): string;
export declare function verifyUserToken(token: string): UserJwtPayload | null;
export declare function signAdminToken(payload: AdminJwtPayload): string;
export declare function verifyAdminToken(token: string): AdminJwtPayload | null;
