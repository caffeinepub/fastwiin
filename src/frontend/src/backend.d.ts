import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface RoundResult {
    winningNumber: bigint;
    winningColor: Color;
    mode: string;
    roundId: bigint;
    timestamp: Time;
}
export type Time = bigint;
export interface Bet {
    mode: string;
    target: BetTarget;
    roundId: bigint;
    amount: number;
}
export type BetTarget = {
    __kind__: "color";
    color: Color;
} | {
    __kind__: "number";
    number: bigint;
};
export interface Round {
    status: RoundStatus;
    winningNumber?: bigint;
    winningColor?: Color;
    mode: string;
    roundId: bigint;
    startTimestamp: Time;
}
export interface GameState {
    lastResults: Array<RoundResult>;
    currentRound: Round;
}
export interface UserProfile {
    name: string;
    phone: string;
}
export interface AuthStatus {
    otpVerified: boolean;
    phone: string;
    registered: boolean;
}
export enum Color {
    red = "red",
    purple = "purple",
    green = "green"
}
export enum RoundStatus {
    settled = "settled",
    open = "open",
    locked = "locked"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deposit(amount: number): Promise<void>;
    getAuthStatus(): Promise<AuthStatus>;
    getBalance(): Promise<number>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGameState(mode: string): Promise<GameState>;
    getUserBets(mode: string, roundId: bigint): Promise<Array<Bet>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    lockRound(mode: string): Promise<void>;
    placeBet(mode: string, target: BetTarget, amount: number): Promise<void>;
    requestOtp(phone: string): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setPassword(password: string): Promise<boolean>;
    settleRound(mode: string): Promise<RoundResult>;
    verifyOtp(otp: string): Promise<boolean>;
}
