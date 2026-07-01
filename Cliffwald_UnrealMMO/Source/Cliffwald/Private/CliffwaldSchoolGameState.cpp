#include "CliffwaldSchoolGameState.h"
#include "Cliffwald.h"
#include "Net/UnrealNetwork.h"

namespace CliffwaldSchoolClock
{
    constexpr int32 MinutesPerDay = 24 * 60;
    constexpr int32 BreakfastStart = 6 * 60 + 30;
    constexpr int32 ClassStart = 8 * 60;
    constexpr int32 LunchStart = 11 * 60;
    constexpr int32 FreeTimeStart = 12 * 60;
    constexpr int32 DinnerStart = 17 * 60;
    constexpr int32 CurfewStart = 18 * 60;
    constexpr int32 SleepStart = 22 * 60;
}

ACliffwaldSchoolGameState::ACliffwaldSchoolGameState()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.TickInterval = 0.25f;
    CurrentPhase = PhaseForMinute(SchoolMinute);
}

void ACliffwaldSchoolGameState::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!HasAuthority())
    {
        return;
    }

    MinuteAccumulator += DeltaSeconds * GameMinutesPerRealSecond;
    const int32 WholeMinutes = FMath::FloorToInt(MinuteAccumulator);
    if (WholeMinutes <= 0)
    {
        return;
    }

    MinuteAccumulator -= static_cast<float>(WholeMinutes);
    AdvanceSchoolMinutes(WholeMinutes);
}

void ACliffwaldSchoolGameState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME(ACliffwaldSchoolGameState, DayIndex);
    DOREPLIFETIME(ACliffwaldSchoolGameState, SchoolMinute);
    DOREPLIFETIME(ACliffwaldSchoolGameState, CurrentPhase);
}

FString ACliffwaldSchoolGameState::GetClockLabel() const
{
    const int32 Hour = SchoolMinute / 60;
    const int32 Minute = SchoolMinute % 60;
    return FString::Printf(TEXT("Day %d %02d:%02d"), DayIndex, Hour, Minute);
}

FString ACliffwaldSchoolGameState::GetPhaseLabel() const
{
    return FString(GetPhaseName(CurrentPhase));
}

ECliffwaldSchoolPhase ACliffwaldSchoolGameState::PhaseForMinute(int32 MinuteOfDay)
{
    MinuteOfDay = ((MinuteOfDay % CliffwaldSchoolClock::MinutesPerDay) + CliffwaldSchoolClock::MinutesPerDay) % CliffwaldSchoolClock::MinutesPerDay;

    if (MinuteOfDay < CliffwaldSchoolClock::BreakfastStart || MinuteOfDay >= CliffwaldSchoolClock::SleepStart)
    {
        return ECliffwaldSchoolPhase::Sleep;
    }
    if (MinuteOfDay < CliffwaldSchoolClock::ClassStart)
    {
        return ECliffwaldSchoolPhase::Breakfast;
    }
    if (MinuteOfDay < CliffwaldSchoolClock::LunchStart)
    {
        return ECliffwaldSchoolPhase::ClassBlock;
    }
    if (MinuteOfDay < CliffwaldSchoolClock::FreeTimeStart)
    {
        return ECliffwaldSchoolPhase::Lunch;
    }
    if (MinuteOfDay < CliffwaldSchoolClock::DinnerStart)
    {
        return ECliffwaldSchoolPhase::FreeTime;
    }
    if (MinuteOfDay < CliffwaldSchoolClock::CurfewStart)
    {
        return ECliffwaldSchoolPhase::Dinner;
    }
    return ECliffwaldSchoolPhase::Curfew;
}

const TCHAR* ACliffwaldSchoolGameState::GetPhaseName(ECliffwaldSchoolPhase Phase)
{
    switch (Phase)
    {
    case ECliffwaldSchoolPhase::Sleep:
        return TEXT("Sleep");
    case ECliffwaldSchoolPhase::Breakfast:
        return TEXT("Breakfast");
    case ECliffwaldSchoolPhase::ClassBlock:
        return TEXT("Class");
    case ECliffwaldSchoolPhase::Lunch:
        return TEXT("Lunch");
    case ECliffwaldSchoolPhase::FreeTime:
        return TEXT("Free time");
    case ECliffwaldSchoolPhase::Dinner:
        return TEXT("Dinner");
    case ECliffwaldSchoolPhase::Curfew:
        return TEXT("Curfew");
    default:
        return TEXT("Unknown");
    }
}

void ACliffwaldSchoolGameState::AdvanceSchoolMinutes(int32 MinutesToAdvance)
{
    const int32 TotalMinutes = ((DayIndex - 1) * CliffwaldSchoolClock::MinutesPerDay) + SchoolMinute + MinutesToAdvance;
    const int32 NewDayIndex = (TotalMinutes / CliffwaldSchoolClock::MinutesPerDay) + 1;
    const int32 NewSchoolMinute = TotalMinutes % CliffwaldSchoolClock::MinutesPerDay;
    ApplyClock(NewDayIndex, NewSchoolMinute);
}

void ACliffwaldSchoolGameState::ApplyClock(int32 InDayIndex, int32 InSchoolMinute)
{
    const ECliffwaldSchoolPhase PreviousPhase = CurrentPhase;

    DayIndex = FMath::Max(1, InDayIndex);
    SchoolMinute = ((InSchoolMinute % CliffwaldSchoolClock::MinutesPerDay) + CliffwaldSchoolClock::MinutesPerDay) % CliffwaldSchoolClock::MinutesPerDay;
    CurrentPhase = PhaseForMinute(SchoolMinute);

    if (CurrentPhase != PreviousPhase)
    {
        UE_LOG(LogCliffwald, Log, TEXT("School clock phase advanced to %s at %s."),
            GetPhaseName(CurrentPhase),
            *GetClockLabel());
    }
}
