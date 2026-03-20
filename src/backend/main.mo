import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Float "mo:core/Float";
import Random "mo:core/Random";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Char "mo:core/Char";
import Iter "mo:core/Iter";


import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ===== MIGRATION: Explicitly retain old stable variables to prevent M0169 errors =====
  type _OldGameStatus = { #waiting; #active; #finished; #flying; #crashed };
  type _OldUserProfile = { name : Text };
  type _OldColorPredictionBet = { amount : Float; color : Color };
  type _OldRoundResult = { id : Nat; result : Color; timestamp : Time.Time };
  type _OldColorPredictionRound = {
    id : Nat;
    startTime : Time.Time;
    status : _OldGameStatus;
    winningColor : ?Color;
  };
  type _OldAviatorBet = {
    amount : Float;
    placedAtMultiplier : Float;
    cashOutMultiplier : ?Float;
  };
  type _OldAviatorRoundResult = {
    roundId : Nat;
    crashMultiplier : Float;
    timestamp : Time.Time;
  };
  type _OldAviatorRound = {
    id : Nat;
    startTime : Time.Time;
    status : _OldGameStatus;
    crashMultiplier : ?Float;
  };

  let userProfiles = Map.empty<Principal, _OldUserProfile>();
  let colorPredictionBets = Map.empty<Principal, _OldColorPredictionBet>();
  let storedColorPredictionRounds = List.empty<_OldRoundResult>();
  var currentColorPredictionRound : _OldColorPredictionRound = {
    id = 0; startTime = 0; status = #waiting; winningColor = null
  };
  let aviatorBets = Map.empty<Principal, _OldAviatorBet>();
  let storedAviatorRounds = List.empty<_OldAviatorRoundResult>();
  var currentAviatorRound : _OldAviatorRound = {
    id = 0; startTime = 0; status = #waiting; crashMultiplier = null
  };
  // ===== END MIGRATION =====

  // ===== USER PROFILE =====
  public type UserProfile = {
    name : Text;
    phone : Text;
  };

  let newUserProfiles = Map.empty<Principal, UserProfile>();

  // ===== AUTH =====
  public type PhoneAccount = {
    phone : Text;
    otpCode : Text;
    otpVerified : Bool;
    password : Text;
    registered : Bool;
  };

  public type AuthStatus = {
    registered : Bool;
    otpVerified : Bool;
    phone : Text;
  };

  let phoneAccounts = Map.empty<Principal, PhoneAccount>();

  // ===== PHONE-KEYED MAPS (for phone-based login) =====
  type PhoneRecord = { password : Text; registered : Bool };
  let phoneIndex = Map.empty<Text, PhoneRecord>();
  let phoneBlocked = Map.empty<Text, Bool>();
  let phoneRegisteredAt = Map.empty<Text, Int>();
  let phoneLoginOtps = Map.empty<Text, Text>();

  // Map phone to principal for authorization checks
  let phoneToPrincipal = Map.empty<Text, Principal>();

  // ===== REFERRAL SYSTEM =====
  public type ReferralRecord = {
    referredPhone : Text;
    signupBonusPaid : Bool;
    depositBonusPaid : Bool;
    timestamp : Int;
  };

  let phoneReferralCodes = Map.empty<Text, Text>();
  let reverseReferralCodes = Map.empty<Text, Text>();
  let referrerOf = Map.empty<Text, Text>();
  let phoneFirstDeposited = Map.empty<Text, Bool>();
  let referralBonuses = Map.empty<Text, [ReferralRecord]>();

  func isRegisteredUser(caller : Principal) : Bool {
    switch (phoneAccounts.get(caller)) {
      case (?acc) { acc.registered };
      case null { false };
    };
  };

  func getCallerPhone(caller : Principal) : ?Text {
    switch (phoneAccounts.get(caller)) {
      case (?acc) { if (acc.registered) { ?acc.phone } else { null } };
      case null { null };
    };
  };

  func isCallerPhoneOwner(caller : Principal, phone : Text) : Bool {
    switch (getCallerPhone(caller)) {
      case (?callerPhone) { callerPhone == phone };
      case null { false };
    };
  };

  public shared ({ caller }) func requestOtp(phone : Text) : async Text {
    let rng = Random.crypto();
    let n = await* rng.natRange(100000, 999999);
    let otp = n.toText();
    let existing : PhoneAccount = switch (phoneAccounts.get(caller)) {
      case (?acc) { { acc with phone; otpCode = otp; otpVerified = false } };
      case null {
        { phone; otpCode = otp; otpVerified = false; password = ""; registered = false };
      };
    };
    phoneAccounts.add(caller, existing);
    phoneLoginOtps.add(phone, otp);
    otp;
  };

  public shared ({ caller }) func verifyOtp(otp : Text) : async Bool {
    switch (phoneAccounts.get(caller)) {
      case (?acc) {
        if (acc.otpCode == otp) {
          phoneAccounts.add(caller, { acc with otpVerified = true });
          true;
        } else { false };
      };
      case null { false };
    };
  };

  public shared ({ caller }) func setPassword(password : Text, referralCode : ?Text) : async Bool {
    if (password.size() < 8) {
      Runtime.trap("Password must be at least 8 characters");
    };

    let account = switch (phoneAccounts.get(caller)) {
      case (null) { return false };
      case (?acc) { acc };
    };
    if (not account.otpVerified) { return false };

    let newUser = not account.registered;
    var signupBonus : Float = 10.0;

    // Apply referral code if provided and user is new
    if (newUser) {
      switch (referralCode) {
        case (?code) {
          switch (reverseReferralCodes.get(code)) {
            case (?referrerPhone) {
              if (referrerPhone != account.phone) {
                signupBonus += 20.0;
                referrerOf.add(account.phone, referrerPhone);
                let record : ReferralRecord = {
                  referredPhone = account.phone;
                  signupBonusPaid = true;
                  depositBonusPaid = false;
                  timestamp = Time.now();
                };
                let existing = switch (referralBonuses.get(referrerPhone)) {
                  case (null) { [] };
                  case (?arr) { arr };
                };
                referralBonuses.add(
                  referrerPhone,
                  Array.tabulate(existing.size() + 1, func(i) { if (i < existing.size()) { existing[i] } else { record } }),
                );
              };
            };
            case (null) {};
          };
        };
        case (null) {};
      };
    };

    phoneAccounts.add(caller, { account with password; registered = true });
    phoneIndex.add(account.phone, { password; registered = true });
    phoneToPrincipal.add(account.phone, caller);

    if (newUser) {
      switch (balances.get(caller)) {
        case null { balances.add(caller, signupBonus) };
        case _ {};
      };
      switch (phoneBalances.get(account.phone)) {
        case null { phoneBalances.add(account.phone, signupBonus) };
        case _ {};
      };
      newUserProfiles.add(caller, { name = ""; phone = account.phone });
      switch (phoneRegisteredAt.get(account.phone)) {
        case null { phoneRegisteredAt.add(account.phone, Time.now()) };
        case _ {};
      };

      // Generate referral code automatically for new user
      let chars = account.phone.toArray();
      let len = chars.size();

      let refCode = if (len <= 6) {
        "FW" # account.phone;
      } else {
        let start = len - 6;
        let digits = chars.sliceToArray(0, start);
        let digitsStr = Text.fromArray(digits);
        "FW" # digitsStr;
      };

      phoneReferralCodes.add(account.phone, refCode);
      reverseReferralCodes.add(refCode, account.phone);
    };
    true;
  };

  public func requestLoginOtp(phone : Text) : async ?Text {
    switch (phoneIndex.get(phone)) {
      case (?_) {
        let rng = Random.crypto();
        let n = await* rng.natRange(100000, 999999);
        let otp = n.toText();
        phoneLoginOtps.add(phone, otp);
        ?otp;
      };
      case null { null };
    };
  };

  public func verifyLoginWithOtp(phone : Text, otp : Text, password : Text) : async Bool {
    let blocked = switch (phoneBlocked.get(phone)) { case (?b) b; case null false };
    if (blocked) { return false };
    switch (phoneLoginOtps.get(phone)) {
      case (?storedOtp) {
        if (storedOtp != otp) { return false };
        switch (phoneIndex.get(phone)) {
          case (?rec) { rec.password == password };
          case null { false };
        };
      };
      case null { false };
    };
  };

  public query ({ caller }) func getAuthStatus() : async AuthStatus {
    switch (phoneAccounts.get(caller)) {
      case (?acc) { { registered = acc.registered; otpVerified = acc.otpVerified; phone = acc.phone } };
      case null { { registered = false; otpVerified = false; phone = "" } };
    };
  };

  public query func isPhoneRegistered(phone : Text) : async Bool {
    switch (phoneIndex.get(phone)) {
      case (?rec) { rec.registered };
      case null { false };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not isRegisteredUser(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view profiles");
    };
    newUserProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    newUserProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not isRegisteredUser(caller)) {
      Runtime.trap("Unauthorized: Only registered users can save profiles");
    };
    newUserProfiles.add(caller, profile);
  };

  public shared ({ caller }) func changePassword(oldPassword : Text, newPassword : Text) : async Bool {
    if (not isRegisteredUser(caller)) {
      Runtime.trap("Unauthorized: Only registered users can change passwords");
    };
    if (newPassword.size() < 8) {
      Runtime.trap("New password must be at least 8 characters");
    };
    switch (phoneAccounts.get(caller)) {
      case (?acc) {
        if (acc.password != oldPassword) { return false };
        phoneAccounts.add(caller, { acc with password = newPassword });
        phoneIndex.add(acc.phone, { password = newPassword; registered = true });
        true;
      };
      case null { false };
    };
  };

  // ===== BALANCE =====
  let balances = Map.empty<Principal, Float>();
  let phoneBalances = Map.empty<Text, Float>();

  public query ({ caller }) func getBalance() : async Float {
    if (not isRegisteredUser(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view balance");
    };
    switch (balances.get(caller)) {
      case (?b) { b };
      case null { 0.0 };
    };
  };

  public query ({ caller }) func getBalanceByPhone(phone : Text) : async Float {
    if (not isCallerPhoneOwner(caller, phone) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own balance");
    };
    switch (phoneBalances.get(phone)) {
      case (?b) { b };
      case null { 0.0 };
    };
  };

  public shared ({ caller }) func deposit(amount : Float) : async () {
    if (not isRegisteredUser(caller)) {
      Runtime.trap("Unauthorized: Only registered users can deposit");
    };
    if (amount <= 0.0) { Runtime.trap("Amount must be positive") };
    let cur = switch (balances.get(caller)) { case (?b) b; case null 0.0 };
    let next = cur + amount;
    if (next > 10000.0) { Runtime.trap("Balance would exceed maximum of Rs10000") };
    balances.add(caller, next);
  };

  // ===== WITHDRAWAL SYSTEM =====
  public type WithdrawalStatus = { #pending; #approved; #rejected };
  public type WithdrawalRecord = {
    id : Text;
    phone : Text;
    amount : Float;
    upiId : Text;
    status : WithdrawalStatus;
    timestamp : Int;
  };

  let withdrawals = Map.empty<Text, WithdrawalRecord>();
  var withdrawalCounter : Nat = 0;

  public shared ({ caller }) func requestWithdrawal(phone : Text, amount : Float, upiId : Text) : async Text {
    if (not isCallerPhoneOwner(caller, phone)) {
      Runtime.trap("Unauthorized: Can only request withdrawal for your own account");
    };
    if (amount <= 0.0) { Runtime.trap("Amount must be positive") };
    let curBal = switch (phoneBalances.get(phone)) { case (?b) b; case null 0.0 };
    if (curBal < amount) { Runtime.trap("Insufficient balance") };
    phoneBalances.add(phone, curBal - amount);
    withdrawalCounter := withdrawalCounter + 1;
    let id = "WD" # withdrawalCounter.toText();
    let record : WithdrawalRecord = {
      id; phone; amount; upiId;
      status = #pending;
      timestamp = Time.now();
    };
    withdrawals.add(id, record);
    id;
  };

  public shared ({ caller }) func approveWithdrawal(id : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can approve withdrawals");
    };
    switch (withdrawals.get(id)) {
      case (?rec) {
        if (rec.status != #pending) { return false };
        withdrawals.add(id, { rec with status = #approved });
        true;
      };
      case null { false };
    };
  };

  public shared ({ caller }) func rejectWithdrawal(id : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can reject withdrawals");
    };
    switch (withdrawals.get(id)) {
      case (?rec) {
        if (rec.status != #pending) { return false };
        let curBal = switch (phoneBalances.get(rec.phone)) { case (?b) b; case null 0.0 };
        phoneBalances.add(rec.phone, curBal + rec.amount);
        withdrawals.add(id, { rec with status = #rejected });
        true;
      };
      case null { false };
    };
  };

  public query ({ caller }) func getAllWithdrawals() : async [WithdrawalRecord] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all withdrawals");
    };
    let result = List.empty<WithdrawalRecord>();
    for ((_, rec) in withdrawals.entries()) {
      result.add(rec);
    };
    result.toVarArray().toArray();
  };

  public query ({ caller }) func getMyWithdrawals(phone : Text) : async [WithdrawalRecord] {
    if (not isCallerPhoneOwner(caller, phone)) {
      Runtime.trap("Unauthorized: Can only view your own withdrawals");
    };
    let result = List.empty<WithdrawalRecord>();
    for ((_, rec) in withdrawals.entries()) {
      if (rec.phone == phone) { result.add(rec) };
    };
    result.toVarArray().toArray();
  };

  // ===== DEPOSIT SYSTEM =====
  public type DepositStatus = { #pending; #approved; #rejected };
  public type DepositRecord = {
    id : Text;
    phone : Text;
    amount : Float;
    upiRef : Text;
    status : DepositStatus;
    timestamp : Int;
  };

  let deposits = Map.empty<Text, DepositRecord>();
  var depositCounter : Nat = 0;

  public shared ({ caller }) func requestDeposit(phone : Text, amount : Float, upiRef : Text) : async Text {
    if (not isCallerPhoneOwner(caller, phone)) {
      Runtime.trap("Unauthorized: Can only request deposit for your own account");
    };
    if (amount <= 0.0) { Runtime.trap("Amount must be positive") };
    depositCounter := depositCounter + 1;
    let id = "DP" # depositCounter.toText();
    let record : DepositRecord = {
      id; phone; amount; upiRef;
      status = #pending;
      timestamp = Time.now();
    };
    deposits.add(id, record);
    id;
  };

  // Modified approveDeposit for first deposit referral bonus
  public shared ({ caller }) func approveDeposit(id : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can approve deposits");
    };
    switch (deposits.get(id)) {
      case (?rec) {
        if (rec.status != #pending) { return false };
        let curBal = switch (phoneBalances.get(rec.phone)) { case (?b) b; case null 0.0 };
        phoneBalances.add(rec.phone, curBal + rec.amount);
        deposits.add(id, { rec with status = #approved });

        // Check if this is first deposit
        let hasDeposited = switch (phoneFirstDeposited.get(rec.phone)) {
          case (null) { false };
          case (?b) { b };
        };

        if (not hasDeposited) {
          phoneFirstDeposited.add(rec.phone, true);
          switch (referrerOf.get(rec.phone)) {
            case (null) {};
            case (?referrer) {
              let refBal = switch (phoneBalances.get(referrer)) { case (?b) b; case null 0.0 };
              phoneBalances.add(referrer, refBal + 100.0);

              // Update referral record for referrer
              let existing = switch (referralBonuses.get(referrer)) {
                case (null) { [] };
                case (?arr) { arr };
              };
              let updated = Array.tabulate(existing.size(), func(i) {
                let oldRec = existing[i];
                if (oldRec.referredPhone == rec.phone) {
                  { oldRec with depositBonusPaid = true; timestamp = Time.now() }
                } else {
                  oldRec
                }
              });
              referralBonuses.add(referrer, updated);
            };
          };
        };
        true;
      };
      case null { false };
    };
  };

  public shared ({ caller }) func rejectDeposit(id : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can reject deposits");
    };
    switch (deposits.get(id)) {
      case (?rec) {
        if (rec.status != #pending) { return false };
        deposits.add(id, { rec with status = #rejected });
        true;
      };
      case null { false };
    };
  };

  public query ({ caller }) func getAllDeposits() : async [DepositRecord] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all deposits");
    };
    let result = List.empty<DepositRecord>();
    for ((_, rec) in deposits.entries()) {
      result.add(rec);
    };
    result.toVarArray().toArray();
  };

  public query ({ caller }) func getMyDeposits(phone : Text) : async [DepositRecord] {
    if (not isCallerPhoneOwner(caller, phone)) {
      Runtime.trap("Unauthorized: Can only view your own deposits");
    };
    let result = List.empty<DepositRecord>();
    for ((_, rec) in deposits.entries()) {
      if (rec.phone == phone) { result.add(rec) };
    };
    result.toVarArray().toArray();
  };

  // ===== REFERRAL APIS =====
  func generateReferralCode(phone : Text) : Text {
    let chars = phone.toArray();
    let len = chars.size();
    if (len <= 6) {
      return "FW" # phone;
    };
    let start = len - 6;

    let digitsArray = chars.sliceToArray(0, start);

    let digits = Text.fromArray(digitsArray);
    "FW" # digits;
  };

  public query ({ caller }) func getReferralCode(phone : Text) : async Text {
    if (not isCallerPhoneOwner(caller, phone) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only get your own referral code");
    };
    switch (phoneReferralCodes.get(phone)) {
      case (?code) { code };
      case null {
        // Return generated code but don't store (query function)
        generateReferralCode(phone);
      };
    };
  };

  public shared ({ caller }) func applyReferralCode(newUserPhone : Text, code : Text) : async Bool {
    if (not isCallerPhoneOwner(caller, newUserPhone)) {
      Runtime.trap("Unauthorized: Can only apply referral code to your own account");
    };
    switch (reverseReferralCodes.get(code)) {
      case (null) { false };
      case (?referrerPhone) {
        if (referrerPhone == newUserPhone) { return false };
        switch (referrerOf.get(newUserPhone)) {
          case (null) {
            referrerOf.add(newUserPhone, referrerPhone);
            let newRecord : ReferralRecord = {
              referredPhone = newUserPhone;
              signupBonusPaid = true;
              depositBonusPaid = false;
              timestamp = Time.now();
            };

            let existing = switch (referralBonuses.get(referrerPhone)) {
              case (null) { [] };
              case (?arr) { arr };
            };
            referralBonuses.add(
              referrerPhone,
              Array.tabulate(existing.size() + 1, func(i) { if (i < existing.size()) { existing[i] } else { newRecord } }),
            );

            let curBal = switch (phoneBalances.get(newUserPhone)) {
              case (?b) { b };
              case null { 0.0 };
            };
            phoneBalances.add(newUserPhone, curBal + 20.0);
            true;
          };
          case (?_) { false };
        };
      };
    };
  };

  public query ({ caller }) func getReferralHistory(phone : Text) : async [ReferralRecord] {
    if (not isCallerPhoneOwner(caller, phone) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own referral history");
    };
    switch (referralBonuses.get(phone)) {
      case (null) { [] };
      case (?arr) { arr };
    };
  };

  // ===== ADMIN USER MANAGEMENT =====
  public type UserSummary = {
    phone : Text;
    balance : Float;
    registeredAt : Int;
    blocked : Bool;
  };

  public query ({ caller }) func getAllUsers() : async [UserSummary] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all users");
    };
    let result = List.empty<UserSummary>();
    for ((phone, _) in phoneIndex.entries()) {
      let bal = switch (phoneBalances.get(phone)) { case (?b) b; case null 0.0 };
      let blocked = switch (phoneBlocked.get(phone)) { case (?b) b; case null false };
      let regAt = switch (phoneRegisteredAt.get(phone)) { case (?t) t; case null 0 };
      result.add({ phone; balance = bal; registeredAt = regAt; blocked });
    };
    result.toVarArray().toArray();
  };

  public shared ({ caller }) func blockUser(phone : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can block users");
    };
    switch (phoneIndex.get(phone)) {
      case (?_) {
        phoneBlocked.add(phone, true);
        true;
      };
      case null { false };
    };
  };

  public shared ({ caller }) func unblockUser(phone : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can unblock users");
    };
    switch (phoneIndex.get(phone)) {
      case (?_) {
        phoneBlocked.add(phone, false);
        true;
      };
      case null { false };
    };
  };

  public shared ({ caller }) func adjustBalance(phone : Text, newBalance : Float) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can adjust balances");
    };
    switch (phoneIndex.get(phone)) {
      case (?_) {
        phoneBalances.add(phone, newBalance);
        true;
      };
      case null { false };
    };
  };

  // ===== GAME TYPES =====
  public type Color = { #green; #red; #purple };
  public type BetTarget = { #color : Color; #number : Nat };

  public type Bet = {
    target : BetTarget;
    amount : Float;
    roundId : Nat;
    mode : Text;
  };

  public type RoundStatus = { #open; #locked; #settled };

  public type Round = {
    roundId : Nat;
    mode : Text;
    startTimestamp : Time.Time;
    status : RoundStatus;
    winningColor : ?Color;
    winningNumber : ?Nat;
  };

  public type RoundResult = {
    roundId : Nat;
    mode : Text;
    winningColor : Color;
    winningNumber : Nat;
    timestamp : Time.Time;
  };

  public type GameState = {
    currentRound : Round;
    lastResults : [RoundResult];
  };

  // ===== GAME STATE =====
  var round30s : Round = { roundId = 1; mode = "30s"; startTimestamp = Time.now(); status = #open; winningColor = null; winningNumber = null };
  var round1m  : Round = { roundId = 1; mode = "1m";  startTimestamp = Time.now(); status = #open; winningColor = null; winningNumber = null };
  var round3m  : Round = { roundId = 1; mode = "3m";  startTimestamp = Time.now(); status = #open; winningColor = null; winningNumber = null };

  let results30s = List.empty<RoundResult>();
  let results1m  = List.empty<RoundResult>();
  let results3m  = List.empty<RoundResult>();

  let allBets = Map.empty<Text, [Bet]>();
  let roundUsers = Map.empty<Text, List.List<Principal>>();

  func betKey(mode : Text, roundId : Nat, user : Principal) : Text {
    mode # "~" # roundId.toText() # "~" # user.toText();
  };

  func roundKey(mode : Text, roundId : Nat) : Text {
    mode # "~" # roundId.toText();
  };

  func getRound(mode : Text) : Round {
    if (mode == "30s") round30s
    else if (mode == "1m") round1m
    else round3m;
  };

  func setRound(mode : Text, r : Round) {
    if (mode == "30s") { round30s := r }
    else if (mode == "1m") { round1m := r }
    else { round3m := r };
  };

  func getResultsList(mode : Text) : List.List<RoundResult> {
    if (mode == "30s") results30s
    else if (mode == "1m") results1m
    else results3m;
  };

  func numberToColor(n : Nat) : Color {
    if (n == 1 or n == 3 or n == 7 or n == 9) { #green }
    else if (n == 2 or n == 4 or n == 6 or n == 8) { #red }
    else { #purple };
  };

  func colorCoversNumber(c : Color, n : Nat) : Bool {
    switch (c) {
      case (#green) { n == 1 or n == 3 or n == 5 or n == 7 or n == 9 };
      case (#red) { n == 0 or n == 2 or n == 4 or n == 6 or n == 8 };
      case (#purple) { n == 0 or n == 5 };
    };
  };

  func colorCoverage(c : Color) : Float {
    switch (c) {
      case (#green) { 5.0 };
      case (#red) { 5.0 };
      case (#purple) { 2.0 };
    };
  };

  func colorPayout(c : Color) : Float {
    switch (c) {
      case (#purple) { 5.0 };
      case _ { 2.0 };
    };
  };

  // ===== BETTING =====
  public shared ({ caller }) func placeBet(mode : Text, target : BetTarget, amount : Float) : async () {
    if (not isRegisteredUser(caller)) {
      Runtime.trap("Unauthorized: Only registered users can place bets");
    };
    if (amount < 10.0) { Runtime.trap("Minimum bet is Rs10") };
    let round = getRound(mode);
    if (round.status != #open) { Runtime.trap("Betting is closed for this round") };
    let bal = switch (balances.get(caller)) { case (?b) b; case null 0.0 };
    if (bal < amount) { Runtime.trap("Insufficient balance") };
    balances.add(caller, bal - amount);
    let key = betKey(mode, round.roundId, caller);
    let existing = switch (allBets.get(key)) { case (?b) b; case null [] };
    let newBet : Bet = { target; amount; roundId = round.roundId; mode };
    allBets.add(key, Array.tabulate<Bet>(existing.size() + 1, func(i) {
      if (i < existing.size()) existing[i] else newBet;
    }));
    let rk = roundKey(mode, round.roundId);
    let users = switch (roundUsers.get(rk)) { case (?u) u; case null List.empty<Principal>() };
    var alreadyTracked = false;
    for (p in users.toVarArray().toArray().vals()) { if (p == caller) { alreadyTracked := true } };
    if (not alreadyTracked) {
      users.add(caller);
      roundUsers.add(rk, users);
    };
  };

  public shared ({ caller }) func lockRound(mode : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can lock rounds");
    };
    let round = getRound(mode);
    if (round.status == #open) {
      setRound(mode, { round with status = #locked });
    };
  };

  public shared ({ caller }) func settleRound(mode : Text) : async RoundResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can settle rounds");
    };
    let round = getRound(mode);
    if (round.status == #settled) { Runtime.trap("Round already settled") };

    var t0 : Float = 0.0; var t1 : Float = 0.0; var t2 : Float = 0.0;
    var t3 : Float = 0.0; var t4 : Float = 0.0; var t5 : Float = 0.0;
    var t6 : Float = 0.0; var t7 : Float = 0.0; var t8 : Float = 0.0;
    var t9 : Float = 0.0;

    func addToTotals(n : Nat, v : Float) {
      if      (n == 0) { t0 := t0 + v }
      else if (n == 1) { t1 := t1 + v }
      else if (n == 2) { t2 := t2 + v }
      else if (n == 3) { t3 := t3 + v }
      else if (n == 4) { t4 := t4 + v }
      else if (n == 5) { t5 := t5 + v }
      else if (n == 6) { t6 := t6 + v }
      else if (n == 7) { t7 := t7 + v }
      else if (n == 8) { t8 := t8 + v }
      else if (n == 9) { t9 := t9 + v };
    };

    func getTotal(n : Nat) : Float {
      if      (n == 0) t0 else if (n == 1) t1 else if (n == 2) t2
      else if (n == 3) t3 else if (n == 4) t4 else if (n == 5) t5
      else if (n == 6) t6 else if (n == 7) t7 else if (n == 8) t8
      else t9;
    };

    let rk = roundKey(mode, round.roundId);
    let users = switch (roundUsers.get(rk)) { case (?u) u.toVarArray().toArray(); case null [] };

    for (user in users.vals()) {
      let key = betKey(mode, round.roundId, user);
      switch (allBets.get(key)) {
        case (?bets) {
          for (bet in bets.vals()) {
            switch (bet.target) {
              case (#number(n)) { addToTotals(n, bet.amount) };
              case (#color(c)) {
                let cnt = colorCoverage(c);
                for (i in Nat.range(0, 10)) {
                  if (colorCoversNumber(c, i)) { addToTotals(i, bet.amount / cnt) };
                };
              };
            };
          };
        };
        case null {};
      };
    };

    var minVal : Float = getTotal(0);
    for (i in Nat.range(1, 10)) {
      let v = getTotal(i);
      if (v < minVal) { minVal := v };
    };

    var tiedCount : Nat = 0;
    for (i in Nat.range(0, 10)) {
      if (getTotal(i) == minVal) { tiedCount := tiedCount + 1 };
    };

    let rng = Random.crypto();
    let pickIdx = await* rng.natRange(0, tiedCount);

    var winNum : Nat = 0;
    var seen : Nat = 0;
    var found = false;
    for (i in Nat.range(0, 10)) {
      if (not found and getTotal(i) == minVal) {
        if (seen == pickIdx) { winNum := i; found := true };
        seen := seen + 1;
      };
    };

    let winColor = numberToColor(winNum);

    for (user in users.vals()) {
      let key = betKey(mode, round.roundId, user);
      switch (allBets.get(key)) {
        case (?bets) {
          var winnings : Float = 0.0;
          for (bet in bets.vals()) {
            switch (bet.target) {
              case (#color(c)) {
                let payout : Float = if (winNum == 0) {
                  if (c == #purple) { bet.amount * 2.5 }
                  else if (c == #red) { bet.amount * 1.0 }
                  else { 0.0 };
                } else if (winNum == 5) {
                  if (c == #green) { bet.amount * 1.0 }
                  else if (c == #purple) { bet.amount * 2.5 }
                  else { 0.0 };
                } else {
                  if (c == winColor) { bet.amount * colorPayout(c) }
                  else { 0.0 };
                };
                winnings := winnings + payout;
              };
              case (#number(n)) {
                if (n == winNum) { winnings := winnings + bet.amount * 9.0 };
              };
            };
          };
          if (winnings > 0.0) {
            let curBal = switch (balances.get(user)) { case (?b) b; case null 0.0 };
            balances.add(user, Float.min(curBal + winnings, 10000.0));
          };
        };
        case null {};
      };
    };

    let result : RoundResult = {
      roundId = round.roundId;
      mode;
      winningColor = winColor;
      winningNumber = winNum;
      timestamp = Time.now();
    };

    let resList = getResultsList(mode);
    resList.add(result);
    while (resList.size() > 20) { ignore resList.removeLast() };

    setRound(mode, {
      roundId = round.roundId + 1;
      mode;
      startTimestamp = Time.now();
      status = #open;
      winningColor = null;
      winningNumber = null;
    });

    result;
  };

  public query ({ caller }) func getGameState(mode : Text) : async GameState {
    let round = getRound(mode);
    let resList = getResultsList(mode);
    {
      currentRound = round;
      lastResults = resList.toVarArray().toArray();
    };
  };

  public query ({ caller }) func getUserBets(mode : Text, roundId : Nat) : async [Bet] {
    if (not isRegisteredUser(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view bet history");
    };
    let key = betKey(mode, roundId, caller);
    switch (allBets.get(key)) { case (?b) b; case null [] };
  };
};
