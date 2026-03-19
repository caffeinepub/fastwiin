import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Time "mo:core/Time";

module {
  // Old types
  type OldActor = {
    userProfiles : Map.Map<Principal, { name : Text }>;
    colorPredictionBets : Map.Map<Principal, { amount : Float; color : { #green; #red; #purple } }>;
    storedColorPredictionRounds : List.List<{ id : Nat; result : { #green; #red; #purple }; timestamp : Time.Time }>;
    currentColorPredictionRound : { id : Nat; startTime : Time.Time; status : { #waiting; #active; #finished; #flying; #crashed }; winningColor : ?{ #green; #red; #purple } };
    aviatorBets : Map.Map<Principal, { amount : Float; placedAtMultiplier : Float; cashOutMultiplier : ?Float }>;
    storedAviatorRounds : List.List<{ roundId : Nat; crashMultiplier : Float; timestamp : Time.Time }>;
    currentAviatorRound : { id : Nat; startTime : Time.Time; status : { #waiting; #active; #finished; #flying; #crashed }; crashMultiplier : ?Float };
    newUserProfiles : Map.Map<Principal, { name : Text; phone : Text }>;
    phoneAccounts : Map.Map<Principal, { phone : Text; otpCode : Text; otpVerified : Bool; password : Text; registered : Bool }>;
    phoneIndex : Map.Map<Text, { password : Text; registered : Bool }>;
    phoneBalances : Map.Map<Text, Float>;
    phoneBlocked : Map.Map<Text, Bool>;
    phoneRegisteredAt : Map.Map<Text, Int>;
    phoneLoginOtps : Map.Map<Text, Text>;
    balances : Map.Map<Principal, Float>;
    withdrawals : Map.Map<Text, { id : Text; phone : Text; amount : Float; upiId : Text; status : { #pending; #approved; #rejected }; timestamp : Int }>;
    deposits : Map.Map<Text, { id : Text; phone : Text; amount : Float; upiRef : Text; status : { #pending; #approved; #rejected }; timestamp : Int }>;
    withdrawalCounter : Nat;
    depositCounter : Nat;
    round30s : { roundId : Nat; mode : Text; startTimestamp : Time.Time; status : { #open; #locked; #settled }; winningColor : ?{ #green; #red; #purple }; winningNumber : ?Nat };
    round1m : { roundId : Nat; mode : Text; startTimestamp : Time.Time; status : { #open; #locked; #settled }; winningColor : ?{ #green; #red; #purple }; winningNumber : ?Nat };
    round3m : { roundId : Nat; mode : Text; startTimestamp : Time.Time; status : { #open; #locked; #settled }; winningColor : ?{ #green; #red; #purple }; winningNumber : ?Nat };
    results30s : List.List<{ roundId : Nat; mode : Text; winningColor : { #green; #red; #purple }; winningNumber : Nat; timestamp : Time.Time }>;
    results1m : List.List<{ roundId : Nat; mode : Text; winningColor : { #green; #red; #purple }; winningNumber : Nat; timestamp : Time.Time }>;
    results3m : List.List<{ roundId : Nat; mode : Text; winningColor : { #green; #red; #purple }; winningNumber : Nat; timestamp : Time.Time }>;
    allBets : Map.Map<Text, [{ target : { #color : { #green; #red; #purple }; #number : Nat }; amount : Float; roundId : Nat; mode : Text }]>;
    roundUsers : Map.Map<Text, List.List<Principal>>;
  };

  // New actor
  type NewActor = {
    userProfiles : Map.Map<Principal, { name : Text }>;
    colorPredictionBets : Map.Map<Principal, { amount : Float; color : { #green; #red; #purple } }>;
    storedColorPredictionRounds : List.List<{ id : Nat; result : { #green; #red; #purple }; timestamp : Time.Time }>;
    currentColorPredictionRound : { id : Nat; startTime : Time.Time; status : { #waiting; #active; #finished; #flying; #crashed }; winningColor : ?{ #green; #red; #purple } };
    aviatorBets : Map.Map<Principal, { amount : Float; placedAtMultiplier : Float; cashOutMultiplier : ?Float }>;
    storedAviatorRounds : List.List<{ roundId : Nat; crashMultiplier : Float; timestamp : Time.Time }>;
    currentAviatorRound : { id : Nat; startTime : Time.Time; status : { #waiting; #active; #finished; #flying; #crashed }; crashMultiplier : ?Float };
    newUserProfiles : Map.Map<Principal, { name : Text; phone : Text }>;
    phoneAccounts : Map.Map<Principal, { phone : Text; otpCode : Text; otpVerified : Bool; password : Text; registered : Bool }>;
    phoneIndex : Map.Map<Text, { password : Text; registered : Bool }>;
    phoneBalances : Map.Map<Text, Float>;
    phoneBlocked : Map.Map<Text, Bool>;
    phoneRegisteredAt : Map.Map<Text, Int>;
    phoneLoginOtps : Map.Map<Text, Text>;
    balances : Map.Map<Principal, Float>;
    withdrawals : Map.Map<Text, { id : Text; phone : Text; amount : Float; upiId : Text; status : { #pending; #approved; #rejected }; timestamp : Int }>;
    deposits : Map.Map<Text, { id : Text; phone : Text; amount : Float; upiRef : Text; status : { #pending; #approved; #rejected }; timestamp : Int }>;
    withdrawalCounter : Nat;
    depositCounter : Nat;
    round30s : { roundId : Nat; mode : Text; startTimestamp : Time.Time; status : { #open; #locked; #settled }; winningColor : ?{ #green; #red; #purple }; winningNumber : ?Nat };
    round1m : { roundId : Nat; mode : Text; startTimestamp : Time.Time; status : { #open; #locked; #settled }; winningColor : ?{ #green; #red; #purple }; winningNumber : ?Nat };
    round3m : { roundId : Nat; mode : Text; startTimestamp : Time.Time; status : { #open; #locked; #settled }; winningColor : ?{ #green; #red; #purple }; winningNumber : ?Nat };
    results30s : List.List<{ roundId : Nat; mode : Text; winningColor : { #green; #red; #purple }; winningNumber : Nat; timestamp : Time.Time }>;
    results1m : List.List<{ roundId : Nat; mode : Text; winningColor : { #green; #red; #purple }; winningNumber : Nat; timestamp : Time.Time }>;
    results3m : List.List<{ roundId : Nat; mode : Text; winningColor : { #green; #red; #purple }; winningNumber : Nat; timestamp : Time.Time }>;
    allBets : Map.Map<Text, [{ target : { #color : { #green; #red; #purple }; #number : Nat }; amount : Float; roundId : Nat; mode : Text }]>;
    roundUsers : Map.Map<Text, List.List<Principal>>;
    phoneReferralCodes : Map.Map<Text, Text>;
    reverseReferralCodes : Map.Map<Text, Text>;
    referralBonuses : Map.Map<Text, [{ referredPhone : Text; signupBonusPaid : Bool; depositBonusPaid : Bool; timestamp : Int }]>;
    referrerOf : Map.Map<Text, Text>;
    phoneFirstDeposited : Map.Map<Text, Bool>;
    phoneToPrincipal : Map.Map<Text, Principal>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      phoneReferralCodes = Map.empty<Text, Text>();
      reverseReferralCodes = Map.empty<Text, Text>();
      referralBonuses = Map.empty<Text, [{ referredPhone : Text; signupBonusPaid : Bool; depositBonusPaid : Bool; timestamp : Int }]>();
      referrerOf = Map.empty<Text, Text>();
      phoneFirstDeposited = Map.empty<Text, Bool>();
      phoneToPrincipal = Map.empty<Text, Principal>();
    };
  };
};
