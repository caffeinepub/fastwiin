import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface WithdrawalRecord {
    id: string;
    status: WithdrawalStatus;
    timestamp: bigint;
    upiId: string;
    phone: string;
    amount: number;
}
export interface Bet {
    mode: string;
    target: BetTarget;
    roundId: bigint;
    amount: number;
}
export interface GameState {
    lastResults: Array<RoundResult>;
    currentRound: Round;
}
export interface RoundResult {
    winningNumber: bigint;
    winningColor: Color;
    mode: string;
    roundId: bigint;
    timestamp: Time;
}
export interface ReferralRecord {
    referredPhone: string;
    signupBonusPaid: boolean;
    timestamp: bigint;
    depositBonusPaid: boolean;
}
export interface DepositRecord {
    id: string;
    status: DepositStatus;
    upiRef: string;
    timestamp: bigint;
    phone: string;
    amount: number;
}
export interface UserSummary {
    balance: number;
    blocked: boolean;
    phone: string;
    registeredAt: bigint;
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
export enum DepositStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
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
    adjustBalance(phone: string, newBalance: number): Promise<boolean>;
    applyReferralCode(newUserPhone: string, code: string): Promise<boolean>;
    approveDeposit(id: string): Promise<boolean>;
    approveWithdrawal(id: string): Promise<boolean>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(phone: string): Promise<boolean>;
    changePassword(oldPassword: string, newPassword: string): Promise<boolean>;
    deposit(amount: number): Promise<void>;
    getAllDeposits(): Promise<Array<DepositRecord>>;
    getAllUsers(): Promise<Array<UserSummary>>;
    getAllWithdrawals(): Promise<Array<WithdrawalRecord>>;
    getAuthStatus(): Promise<AuthStatus>;
    getBalance(): Promise<number>;
    getBalanceByPhone(phone: string): Promise<number>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGameState(mode: string): Promise<GameState>;
    getMyDeposits(phone: string): Promise<Array<DepositRecord>>;
    getMyWithdrawals(phone: string): Promise<Array<WithdrawalRecord>>;
    getReferralCode(phone: string): Promise<string>;
    getReferralHistory(phone: string): Promise<Array<ReferralRecord>>;
    getUserBets(mode: string, roundId: bigint): Promise<Array<Bet>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isPhoneRegistered(phone: string): Promise<boolean>;
    lockRound(mode: string): Promise<void>;
    placeBet(mode: string, target: BetTarget, amount: number): Promise<void>;
    rejectDeposit(id: string): Promise<boolean>;
    rejectWithdrawal(id: string): Promise<boolean>;
    requestDeposit(phone: string, amount: number, upiRef: string): Promise<string>;
    requestLoginOtp(phone: string): Promise<string | null>;
    requestOtp(phone: string): Promise<string>;
    requestWithdrawal(phone: string, amount: number, upiId: string): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setPassword(password: string, referralCode: string | null): Promise<boolean>;
    settleRound(mode: string): Promise<RoundResult>;
    unblockUser(phone: string): Promise<boolean>;
    verifyLoginWithOtp(phone: string, otp: string, password: string): Promise<boolean>;
    verifyOtp(otp: string): Promise<boolean>;
}
